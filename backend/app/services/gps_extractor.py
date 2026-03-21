"""
Road Report Backend - GPS Extraction Service
บริการสกัดพิกัด GPS จากข้อมูล EXIF ของรูปภาพ
"""

import io
from typing import Optional, Tuple

import exifread
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS


def _convert_to_degrees(value) -> float:
    """
    แปลงค่าพิกัดจาก Rational Number (DMS) เป็น Decimal Degrees (DD)
    ขั้นตอน: DD = Degrees + (Minutes/60) + (Seconds/3600)
    """
    try:
        # กรณีข้อมูลมาจาก exifread (IFD_Tag)
        if hasattr(value, 'values'):
            # d, m, s จะเป็น Ratio object [num/den]
            d = float(value.values[0].num) / float(value.values[0].den)
            m = float(value.values[1].num) / float(value.values[1].den)
            s = float(value.values[2].num) / float(value.values[2].den)
        
        # กรณีข้อมูลมาจาก Pillow (Tuple of Fractions)
        elif isinstance(value, (list, tuple)):
            # ตรวจสอบรูปแบบ ((num, den), (num, den), (num, den)) หรือ [num, num, num]
            def get_val(v):
                if isinstance(v, (tuple, list)) and len(v) == 2:
                    return float(v[0]) / float(v[1])
                return float(v)

            d = get_val(value[0])
            m = get_val(value[1])
            s = get_val(value[2])
        else:
            return 0.0

        return d + (m / 60.0) + (s / 3600.0)
    except Exception as e:
        print(f"❌ Error converting DMS to DD: {e}")
        return 0.0


def extract_gps_from_exif(image_bytes: bytes) -> Tuple[Optional[float], Optional[float]]:
    """
    สกัดพิกัด GPS จากข้อมูล EXIF ของรูปภาพ

    Args:
        image_bytes: ข้อมูลรูปภาพในรูปแบบ bytes

    Returns:
        Tuple ของ (latitude, longitude) หรือ (None, None) ถ้าไม่พบข้อมูล GPS
    """
    latitude = None
    longitude = None

    # วิธีที่ 1: ใช้ exifread (รองรับรูปแบบ EXIF ที่หลากหลายกว่า)
    try:
        tags = exifread.process_file(io.BytesIO(image_bytes), details=False)

        gps_latitude = tags.get("GPS GPSLatitude")
        gps_latitude_ref = tags.get("GPS GPSLatitudeRef")
        gps_longitude = tags.get("GPS GPSLongitude")
        gps_longitude_ref = tags.get("GPS GPSLongitudeRef")

        if gps_latitude and gps_longitude and gps_latitude_ref and gps_longitude_ref:
            lat = _convert_to_degrees(gps_latitude)
            lon = _convert_to_degrees(gps_longitude)

            # ปรับเครื่องหมายตามทิศทาง (S = ลบ, W = ลบ)
            if str(gps_latitude_ref) == "S":
                lat = -lat
            if str(gps_longitude_ref) == "W":
                lon = -lon

            latitude = round(lat, 6)
            longitude = round(lon, 6)
            print(f"📍 [exifread] พบพิกัด GPS: {latitude}, {longitude}")
            return latitude, longitude

    except Exception as e:
        print(f"⚠️ exifread ไม่สามารถอ่าน EXIF ได้: {e}")

    # วิธีที่ 2: Fallback ใช้ Pillow
    try:
        img = Image.open(io.BytesIO(image_bytes))
        exif_data = img._getexif()

        if exif_data:
            gps_info = {}
            for tag_id, value in exif_data.items():
                tag = TAGS.get(tag_id, tag_id)
                if tag == "GPSInfo":
                    for gps_tag_id in value:
                        gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                        gps_info[gps_tag] = value[gps_tag_id]

            if "GPSLatitude" in gps_info and "GPSLongitude" in gps_info:
                lat = _convert_to_degrees(gps_info["GPSLatitude"])
                lon = _convert_to_degrees(gps_info["GPSLongitude"])

                if gps_info.get("GPSLatitudeRef", "N") == "S":
                    lat = -lat
                if gps_info.get("GPSLongitudeRef", "E") == "W":
                    lon = -lon

                latitude = round(lat, 6)
                longitude = round(lon, 6)
                print(f"📍 [Pillow] พบพิกัด GPS: {latitude}, {longitude}")
                return latitude, longitude

    except Exception as e:
        print(f"⚠️ Pillow ไม่สามารถอ่าน EXIF ได้: {e}")

    print("❌ ไม่พบข้อมูล GPS ในรูปภาพ")
    return None, None
