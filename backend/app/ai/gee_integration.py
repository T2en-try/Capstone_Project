import ee
import requests
from datetime import datetime, timedelta
import random 
import os
import osmnx as ox
import networkx as nx

from app.core.config import settings

def init_gee():
    """
    Initialize Google Earth Engine during application startup.
    Fails fast (raises an exception) if configuration is missing or invalid.
    """
    print("🌍 กำลังเริ่มต้น Google Earth Engine...")
    SERVICE_ACCOUNT = settings.GEE_SERVICE_ACCOUNT
    KEY_PATH = settings.GEE_KEY_PATH
    PROJECT_ID = settings.GEE_PROJECT_ID

    if not SERVICE_ACCOUNT or not KEY_PATH or not PROJECT_ID:
        error_msg = "GEE_SERVICE_ACCOUNT, GEE_KEY_PATH, or GEE_PROJECT_ID is missing from environment variables!"
        print(f"❌ ERROR: {error_msg}")
        raise ValueError(error_msg)
    
    try:
        credentials = ee.ServiceAccountCredentials(SERVICE_ACCOUNT, KEY_PATH)
        ee.Initialize(credentials, project=PROJECT_ID)
        print("✅ Google Earth Engine พร้อมใช้งาน")
    except Exception as e:
        print(f"❌ Failed to initialize Google Earth Engine: {e}")
        raise RuntimeError(f"GEE Initialization Failed: {e}")

def get_environment_data(lat, lon):
    """
    ฟังก์ชันดึงสภาพแวดล้อม พร้อมระบบดักจับ Error กรณีดาวเทียมไม่มีข้อมูล
    """
    point = ee.Geometry.Point([lon, lat])
    today = datetime.now()
    
    # คำนวณวันที่ย้อนหลัง (ขยายเวลา NDVI เป็น 90 วันเผื่อดาวเทียมอัปเดตช้า)
    end_date_annual = today.strftime('%Y-%m-%d')
    start_date_annual = (today - timedelta(days=365)).strftime('%Y-%m-%d')
    end_date_recent = today.strftime('%Y-%m-%d')
    start_date_recent = (today - timedelta(days=30)).strftime('%Y-%m-%d')
    start_date_ndvi = (today - timedelta(days=90)).strftime('%Y-%m-%d')

    print(f"กำลังดึงข้อมูล GEE พิกัด {lat}, {lon}...")

    # ตั้งค่าเริ่มต้นเผื่อดึงข้อมูลไม่สำเร็จ
    nightlight = 0
    rainfall = 0
    soil_moisture = 0
    ndvi_value = 0
    estimated_material = "ไม่ระบุ"
    elevation = 0
    slope = 0

    # 1. Nightlight (ความพลุกพล่าน)
    try:
        viirs = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG') \
                  .filterBounds(point).filterDate(start_date_annual, end_date_annual).median()
        val = viirs.select('avg_rad').reduceRegion(
            reducer=ee.Reducer.first(), geometry=point, scale=500
        ).get('avg_rad').getInfo()
        if val: nightlight = val
    except Exception as e:
        print(f"⚠️ ข้ามการดึง Nightlight: {e}")

    # 2. Rainfall (น้ำฝนสะสม)
    try:
        chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY') \
                    .filterBounds(point).filterDate(start_date_annual, end_date_annual).sum()
        val = chirps.select('precipitation').reduceRegion(
            reducer=ee.Reducer.first(), geometry=point, scale=5000
        ).get('precipitation').getInfo()
        if val: rainfall = val
    except Exception as e:
        print(f"⚠️ ข้ามการดึง Rainfall: {e}")

    # 3. Soil Moisture (ความชื้นดิน)
    try:
        smap = ee.ImageCollection('NASA/SMAP/SPL4SMGP/008') \
                 .filterBounds(point).filterDate(start_date_recent, end_date_recent).mean()
        val = smap.select('sm_surface').reduceRegion(
            reducer=ee.Reducer.first(), geometry=point, scale=9000
        ).get('sm_surface').getInfo()
        if val: soil_moisture = val
    except Exception as e:
        print(f"⚠️ ข้ามการดึง Soil Moisture: {e}")

    # 4. NDVI & Surface Material (Sentinel-2 แทน MODIS)
    try:
        s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
               .filterBounds(point).filterDate(start_date_ndvi, end_date_recent) \
               .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)).median()
               
        # คำนวณ NDVI จาก B8 (NIR) และ B4 (Red)
        ndvi = s2.normalizedDifference(['B8', 'B4'])
        val_ndvi = ndvi.reduceRegion(
            reducer=ee.Reducer.first(), geometry=point, scale=10
        ).get('nd').getInfo()
        
        if val_ndvi is not None: ndvi_value = val_ndvi

        val_b4 = s2.select('B4').reduceRegion(
            reducer=ee.Reducer.first(), geometry=point, scale=10
        ).get('B4').getInfo()
        
        if val_b4:
            # ใช้ NDVI เช็คก่อนว่าใช่ถนนแน่หรือเปล่า
            if ndvi_value > 0.3:
                estimated_material = "พื้นที่ป่า/ทางดิน (พืชพรรณหนาแน่น)"
            elif val_b4 > 1500: # ถ้าสะท้อนแสงสว่างมาก = คอนกรีต
                estimated_material = "คอนกรีต (Concrete)"
            else: # ถ้าสะท้อนแสงน้อยดูดซับความร้อน = ยางมะตอย
                estimated_material = "ยางมะตอย (Asphalt)"
    except Exception as e:
        print(f"⚠️ ข้ามการดึง Sentinel-2 (NDVI & Material): {e}")

    # 5. Elevation & Slope (SRTM DEM)
    try:
        dem = ee.Image('USGS/SRTMGL1_003')
        terrain = ee.Terrain.products(dem) # มีทั้ง elevation และ slope
        
        elev_val = terrain.select('elevation').reduceRegion(
            reducer=ee.Reducer.first(), geometry=point, scale=30
        ).get('elevation').getInfo()
        if elev_val is not None: elevation = elev_val
        
        slope_val = terrain.select('slope').reduceRegion(
            reducer=ee.Reducer.first(), geometry=point, scale=30
        ).get('slope').getInfo()
        if slope_val is not None: slope = slope_val
    except Exception as e:
        print(f"⚠️ ข้ามการดึง Elevation & Slope: {e}")

    return {
        "date_analyzed": today.strftime('%Y-%m-%d'),
        "nightlight_radiance": round(nightlight, 2),
        "rainfall_last_12m_mm": round(rainfall, 2),
        "soil_moisture_last_30d_mm": round(soil_moisture, 4),
        "ndvi_index": round(ndvi_value, 4),
        "estimated_material": estimated_material,
        "elevation_m": round(elevation, 2),
        "slope_deg": round(slope, 2)
    }

def get_road_type(lat, lon, radius_meters=50):
    """
    ฟังก์ชันดึงประเภทถนน เลน ความเร็วจำกัด จากพิกัด GPS โดยใช้ OSMnx
    """
    print("กำลังตรวจสอบประเภทถนนจาก OSMnx...")
    
    highway_type = 'unknown'
    road_name = 'ไม่มีชื่อถนน'
    lanes = 2
    speed_limit = 50.0
    
    try:
        # ใช้ OSMnx ดึงกราฟถนนบริเวณพิกัดแบบ Drive
        G = ox.graph_from_point((lat, lon), dist=radius_meters, network_type='drive')
        
        if G and len(G.edges) > 0:
            nearest_edge = ox.nearest_edges(G, X=lon, Y=lat)
            edge_data = G.get_edge_data(nearest_edge[0], nearest_edge[1])[0]
            
            hw = edge_data.get('highway', 'unknown')
            highway_type = hw[0] if isinstance(hw, list) else hw
            
            nm = edge_data.get('name', 'ไม่มีชื่อถนน')
            road_name = nm[0] if isinstance(nm, list) else nm
            
            ln = edge_data.get('lanes')
            if ln:
                if isinstance(ln, list): ln = ln[0]
                try: lanes = int(ln)
                except ValueError: pass
                
            ms = edge_data.get('maxspeed')
            if ms:
                if isinstance(ms, list): ms = ms[0]
                import re
                ms_cleaned = re.sub(r'[^\d.]', '', str(ms))
                try: 
                    if ms_cleaned: speed_limit = float(ms_cleaned)
                except ValueError: pass
                
    except Exception as e:
        print(f"เกิดข้อผิดพลาดในการดึงข้อมูล OSMnx (Road): {e}")
        
    road_type_mapping = {
        'motorway': 'ทางด่วนพิเศษ',
        'trunk': 'ทางหลวงแผ่นดิน',
        'primary': 'ถนนสายหลัก',
        'secondary': 'ถนนสายรอง',
        'tertiary': 'ถนนท้องถิ่น',
        'unclassified': 'ถนนในพื้นที่',
        'residential': 'ถนนในหมู่บ้าน/ชุมชน',
        'service': 'ซอย/ถนนบริการ'
    }
    
    thai_road_type = road_type_mapping.get(highway_type, highway_type)
    
    return {
        "road_name": road_name,
        "osm_highway_type": highway_type,
        "thai_road_type": thai_road_type,
        "lanes": lanes,
        "speed_limit": speed_limit
    }

def get_crowdsource_data(lat, lon, radius_meters=50):
    """
    ฟังก์ชันจำลองดึงข้อมูลการแจ้งเหตุซ่อมถนนจากประชาชน (Crowdsource)
    ในสถานการณ์จริง ฟังก์ชันนี้จะไป Query จาก Database ของระบบ PMS
    """
    print(f"กำลังตรวจสอบประวัติการแจ้งเหตุในรัศมี {radius_meters} เมตร...")
    
    has_reports = random.choice([True, True, True, True, True, True, True, False, False, False])
    
    if has_reports:
        report_count = random.randint(1, 15)
        days_since_last_report = random.randint(0, 30)
        avg_severity_score = round(random.uniform(2.5, 5.0), 1)
    else:
        report_count = 0
        days_since_last_report = 999 
        avg_severity_score = 0.0

    return {
        "crowdsource_report_count_30d": report_count,
        "days_since_last_report": days_since_last_report,
        "user_severity_score_avg": avg_severity_score
    }

def get_poi_data(lat, lon, radius_meters=1000):
    """
    ฟังก์ชันดึงข้อมูลสถานที่สำคัญ (โรงพยาบาล, โรงเรียน, ร้านสะดวกซื้อ/เซเว่น) 
    โดยใช้ OSMnx และหาระยะห่างไปยัง POI สำคัญที่ใกล้ที่สุด
    """
    print(f"กำลังตรวจสอบสถานที่สำคัญ (POIs) ในรัศมี {radius_meters} เมตรจาก OSMnx...")
    
    poi_count = 0
    hospitals = 0
    schools = 0
    shops = 0
    pi_score = 0
    nearest_poi_distance_m = float(radius_meters)
    
    tags = {
        'amenity': ['hospital', 'clinic', 'school', 'university'],
        'shop': ['supermarket', 'convenience', 'mall']
    }
    
    try:
        try:
            pois = ox.features_from_point((lat, lon), tags, dist=radius_meters)
        except AttributeError:
            pois = ox.geometries_from_point((lat, lon), tags, dist=radius_meters)
            
        if not pois.empty:
            poi_count = len(pois)
            
            if 'amenity' in pois.columns:
                hospitals = len(pois[pois['amenity'].isin(['hospital', 'clinic'])])
                schools = len(pois[pois['amenity'].isin(['school', 'university'])])
            
            if 'shop' in pois.columns:
                shops = len(pois[pois['shop'].isin(['supermarket', 'convenience', 'mall'])])
            
            from shapely.geometry import Point
            import geopandas as gpd
            
            center_point = Point(lon, lat)
            center_gdf = gpd.GeoDataFrame(geometry=[center_point], crs="EPSG:4326")
            
            pois = pois.to_crs(center_gdf.estimate_utm_crs())
            center_gdf = center_gdf.to_crs(pois.crs)
            
            distances = pois.geometry.distance(center_gdf.geometry.iloc[0])
            if not distances.empty:
                nearest_poi_distance_m = float(distances.min())
            
            pi_score = (hospitals * 3) + (schools * 2) + (shops * 1)
            
    except Exception as e:
        print(f"เกิดข้อผิดพลาดในการดึงข้อมูล POIs จาก OSMnx: {e}")

    return {
        "total_pois_found": poi_count,
        "hospitals_count": hospitals,
        "schools_count": schools,
        "shops_count": shops,
        "community_impact_score_pi": pi_score,
        "nearest_poi_distance_m": round(nearest_poi_distance_m, 2)
    }

# ==========================================
# ทดสอบการเรียกใช้งานแบบครบวงจร (Full Pipeline)
if __name__ == "__main__":
    print("=== เริ่มกระบวนการดึงข้อมูล Data Pipeline (GEE + GIS + Crowdsource) ===")
    
    # พิกัด มทส. 
    target_lat, target_lon = 14.8781, 102.0156
    
    # 1. ดึงข้อมูลสภาพแวดล้อม (GEE)
    gee_data = get_environment_data(target_lat, target_lon)
    
    # 2. ดึงข้อมูลประเภทถนน (OSM)
    road_data = get_road_type(target_lat, target_lon)
    
    # 3. ดึงข้อมูลแจ้งเหตุ (Crowdsource)
    crowd_data = get_crowdsource_data(target_lat, target_lon)
    
    # 4. ดึงข้อมูลสถานที่สำคัญ (POIs)
    poi_data = get_poi_data(target_lat, target_lon)
    
    # --- รวมร่างข้อมูลทั้งหมดเป็น Attribute Vector ---
    print(f"\n--- 🌟 สรุปข้อมูล Feature Vector เตรียมเข้า Model 🌟 ---")
    print(f"พิกัด (Lat, Lon): {target_lat}, {target_lon}")
    print(f"[{'GIS':<12}] ประเภทถนน: {road_data['thai_road_type']} (OSM Tag: {road_data['osm_highway_type']})")
    print(f"[{'GIS':<12}] เลน: {road_data['lanes']}, ความเร็วจำกัด: {road_data['speed_limit']} km/h")
    print(f"[{'GIS':<12}] ผลกระทบชุมชน (POIs): พบ {poi_data['total_pois_found']} แห่ง (รพ:{poi_data['hospitals_count']}, รร:{poi_data['schools_count']}, ร้านค้า:{poi_data['shops_count']}) -> Score: {poi_data['community_impact_score_pi']}")
    print(f"[{'GIS':<12}] ระยะห่าง POI ที่ใกล้ที่สุด: {poi_data['nearest_poi_distance_m']} เมตร")
    print(f"[{'GEE':<12}] วัสดุพื้นผิว (Surface): {gee_data['estimated_material']}")
    print(f"[{'GEE':<12}] ความพลุกพล่าน (Nightlight): {gee_data['nightlight_radiance']}")
    print(f"[{'GEE':<12}] ปริมาณฝน 1 ปี (Rainfall): {gee_data['rainfall_last_12m_mm']} mm")
    print(f"[{'GEE':<12}] ความชื้นดิน 30 วัน (Soil Moisture): {gee_data['soil_moisture_last_30d_mm']} mm")
    print(f"[{'GEE':<12}] ดัชนีพืชพรรณ (NDVI): {gee_data['ndvi_index']}")
    print(f"[{'GEE':<12}] ระดับความสูง (Elevation): {gee_data['elevation_m']} m")
    print(f"[{'GEE':<12}] ความลาดชัน (Slope): {gee_data['slope_deg']} องศา")
    
    # แสดงข้อมูล Crowdsource
    if crowd_data['crowdsource_report_count_30d'] > 0:
        print(f"[{'Crowdsource':<12}] มีคนแจ้งเหตุ: {crowd_data['crowdsource_report_count_30d']} ครั้ง (ใน 30 วัน)")
        print(f"[{'Crowdsource':<12}] แจ้งล่าสุดเมื่อ: {crowd_data['days_since_last_report']} วันที่แล้ว")
        print(f"[{'Crowdsource':<12}] ความรุนแรงจากผู้แจ้ง: {crowd_data['user_severity_score_avg']} / 5.0")
    else:
         print(f"[{'Crowdsource':<12}] ไม่มีประวัติการแจ้งเหตุจากประชาชนในบริเวณนี้")
    
    print("\n✅ ท่อข้อมูลพร้อม 100%! ขั้นตอนต่อไปคือการสร้าง API รวมร่างกับโมเดล RT-DETR ครับ 🚀")