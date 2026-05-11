import ee
import requests
from datetime import datetime, timedelta
import random 

# เริ่มต้นการเชื่อมต่อ (ใช้ Project ID ของคุณ)
SERVICE_ACCOUNT = 'road-remaining-life-prediction@sturdy-web-472311-a8.iam.gserviceaccount.com'
KEY_PATH = 'app/services/Road-maintain.json'

credentials = ee.ServiceAccountCredentials(SERVICE_ACCOUNT, KEY_PATH)
ee.Initialize(credentials, project='sturdy-web-472311-a8')

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

    # 4. NDVI (ดัชนีพืชพรรณ)
    try:
        modis_ndvi = ee.ImageCollection('MODIS/061/MOD13Q1') \
                      .filterBounds(point).filterDate(start_date_ndvi, end_date_recent).mean()
        val = modis_ndvi.select('NDVI').reduceRegion(
            reducer=ee.Reducer.first(), geometry=point, scale=250
        ).get('NDVI').getInfo()
        if val: ndvi_value = val * 0.0001
    except Exception as e:
        print(f"⚠️ ข้ามการดึง NDVI: {e}")

    # 5. Surface Material (จำแนกคอนกรีต vs ยางมะตอย ด้วย Sentinel-2)
    try:
        s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
               .filterBounds(point).filterDate(start_date_ndvi, end_date_recent) \
               .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)).median()
        val = s2.select('B4').reduceRegion(
            reducer=ee.Reducer.first(), geometry=point, scale=10
        ).get('B4').getInfo()
        
        if val:
            # ใช้ NDVI เช็คก่อนว่าใช่ถนนแน่หรือเปล่า
            if ndvi_value > 0.3:
                estimated_material = "พื้นที่ป่า/ทางดิน (พืชพรรณหนาแน่น)"
            elif val > 1500: # ถ้าสะท้อนแสงสว่างมาก = คอนกรีต
                estimated_material = "คอนกรีต (Concrete)"
            else: # ถ้าสะท้อนแสงน้อยดูดซับความร้อน = ยางมะตอย
                estimated_material = "ยางมะตอย (Asphalt)"
    except Exception as e:
        print(f"⚠️ ข้ามการดึง Surface Material: {e}")

    return {
        "date_analyzed": today.strftime('%Y-%m-%d'),
        "nightlight_radiance": round(nightlight, 2),
        "rainfall_last_12m_mm": round(rainfall, 2),
        "soil_moisture_last_30d_mm": round(soil_moisture, 4),
        "ndvi_index": round(ndvi_value, 4),
        "estimated_material": estimated_material  
    }

def get_road_type(lat, lon, radius_meters=10):
    """
    ฟังก์ชันดึงประเภทถนนจากพิกัด GPS โดยใช้ OpenStreetMap (Overpass API)
    """
    print("กำลังตรวจสอบประเภทถนนจาก OpenStreetMap...")
    
    overpass_url = "http://overpass-api.de/api/interpreter"
    overpass_query = f"""
    [out:json];
    way(around:{radius_meters},{lat},{lon})["highway"];
    out tags;
    """
    
    try:
        response = requests.post(overpass_url, data={'data': overpass_query})
        response.raise_for_status()
        data = response.json()
        
        if data['elements']:
            road_tags = data['elements'][0].get('tags', {})
            highway_type = road_tags.get('highway', 'unknown')
            road_name = road_tags.get('name', 'ไม่มีชื่อถนน')
            
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
                "thai_road_type": thai_road_type
            }
        else:
             return {"road_name": "ไม่พบข้อมูล", "osm_highway_type": "none", "thai_road_type": "ไม่ใช่ถนน/ไม่พบข้อมูล"}
             
    except Exception as e:
        print(f"เกิดข้อผิดพลาดในการดึงข้อมูล OSM: {e}")
        return {"road_name": "error", "osm_highway_type": "error", "thai_road_type": "error"}

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

def get_poi_data(lat, lon, radius_meters=500):
    """
    ฟังก์ชันดึงข้อมูลสถานที่สำคัญ (โรงพยาบาล, โรงเรียน, ร้านสะดวกซื้อ/เซเว่น) 
    ในรัศมีที่กำหนด เพื่อคำนวณผลกระทบต่อชุมชน (Community Impact)
    """
    print(f"กำลังตรวจสอบสถานที่สำคัญ (POIs) ในรัศมี {radius_meters} เมตร...")
    
    overpass_url = "http://overpass-api.de/api/interpreter"
    
    # Query หา โรงพยาบาล, คลินิก, โรงเรียน, มหาวิทยาลัย, เซเว่น/ซูเปอร์มาร์เก็ต
    overpass_query = f"""
    [out:json];
    (
      node(around:{radius_meters},{lat},{lon})["amenity"~"hospital|clinic|school|university"];
      node(around:{radius_meters},{lat},{lon})["shop"~"supermarket|convenience|mall"];
    );
    out center;
    """
    
    try:
        response = requests.post(overpass_url, data={'data': overpass_query})
        response.raise_for_status()
        data = response.json()
        
        elements = data.get('elements', [])
        poi_count = len(elements)
        
        # จัดกลุ่มประเภทสถานที่ที่เจอ
        hospitals = sum(1 for el in elements if el.get('tags', {}).get('amenity') in ['hospital', 'clinic'])
        schools = sum(1 for el in elements if el.get('tags', {}).get('amenity') in ['school', 'university'])
        shops = sum(1 for el in elements if el.get('tags', {}).get('shop') in ['supermarket', 'convenience', 'mall'])
        
        # คำนวณคะแนน P_i เบื้องต้น (ถ่วงน้ำหนัก: รพ.=3, โรงเรียน=2, ร้านค้า=1)
        pi_score = (hospitals * 3) + (schools * 2) + (shops * 1)
        
        return {
            "total_pois_found": poi_count,
            "hospitals_count": hospitals,
            "schools_count": schools,
            "shops_count": shops,
            "community_impact_score_pi": pi_score
        }
        
    except Exception as e:
        print(f"เกิดข้อผิดพลาดในการดึงข้อมูล POIs: {e}")
        return {"total_pois_found": 0, "hospitals_count": 0, "schools_count": 0, "shops_count": 0, "community_impact_score_pi": 0}

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
    print(f"[{'GIS':<12}] ผลกระทบชุมชน (POIs): พบ {poi_data['total_pois_found']} แห่ง (รพ:{poi_data['hospitals_count']}, รร:{poi_data['schools_count']}, ร้านค้า:{poi_data['shops_count']}) -> Score: {poi_data['community_impact_score_pi']}")
    print(f"[{'GEE':<12}] วัสดุพื้นผิว (Surface): {gee_data['estimated_material']}")
    print(f"[{'GEE':<12}] ความพลุกพล่าน (Nightlight): {gee_data['nightlight_radiance']}")
    print(f"[{'GEE':<12}] ปริมาณฝน 1 ปี (Rainfall): {gee_data['rainfall_last_12m_mm']} mm")
    print(f"[{'GEE':<12}] ความชื้นดิน 30 วัน (Soil Moisture): {gee_data['soil_moisture_last_30d_mm']} mm")
    print(f"[{'GEE':<12}] ดัชนีพืชพรรณ (NDVI): {gee_data['ndvi_index']}")
    
    # แสดงข้อมูล Crowdsource
    if crowd_data['crowdsource_report_count_30d'] > 0:
        print(f"[{'Crowdsource':<12}] มีคนแจ้งเหตุ: {crowd_data['crowdsource_report_count_30d']} ครั้ง (ใน 30 วัน)")
        print(f"[{'Crowdsource':<12}] แจ้งล่าสุดเมื่อ: {crowd_data['days_since_last_report']} วันที่แล้ว")
        print(f"[{'Crowdsource':<12}] ความรุนแรงจากผู้แจ้ง: {crowd_data['user_severity_score_avg']} / 5.0")
    else:
         print(f"[{'Crowdsource':<12}] ไม่มีประวัติการแจ้งเหตุจากประชาชนในบริเวณนี้")
    
    print("\n✅ ท่อข้อมูลพร้อม 100%! ขั้นตอนต่อไปคือการสร้าง API รวมร่างกับโมเดล RT-DETR ครับ 🚀")