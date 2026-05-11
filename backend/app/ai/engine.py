import os
import torch
import cv2
from ultralytics import RTDETR

# นำเข้าฟังก์ชันดึง Context
from app.ai.gee_integration import get_environment_data, get_road_type, get_crowdsource_data

# กำหนดคลาสและน้ำหนัก
CLASSES = ['D00', 'D10', 'D20', 'D40']
SEVERITY_WEIGHTS = {
    'D00': 2, 'D10': 2, 'D20': 4, 'D40': 5
}

# ถ้า best.pt อยู่ที่เดียวกับ main.py ใช้แบบนี้ได้เลย ปลอดภัยที่สุดครับ
MODEL_PATH = os.path.join(os.getcwd(), 'best.pt')

class PRIIGSAIEngine:
    def __init__(self):
        self.model = None

    def load_model(self):
        """โหลดโมเดล RT-DETR จาก Ultralytics"""
        print("🧠 กำลังโหลดโมเดล RT-DETR (Fold 2)...")
        if os.path.exists(MODEL_PATH):
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
            self.model = RTDETR(MODEL_PATH)
            self.model.to(device)
            print(f"✅ โหลดโมเดล RT-DETR สำเร็จ! (ทำงานบน {device.upper()})")
        else:
            print(f"❌ หาไฟล์โมเดลไม่พบที่: {MODEL_PATH}")

    def predict_damage(self, image_path: str, threshold=0.30):
        """วิเคราะห์ภาพและคำนวณ CV Features"""
        if not self.model:
            raise Exception("ยังไม่ได้โหลดโมเดลเข้าสู่ระบบ")

        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"อ่านไฟล์รูปภาพไม่ได้: {image_path}")
        image_height, image_width = img.shape[:2]
        image_area = image_width * image_height

        results = self.model.predict(source=image_path, conf=threshold, verbose=False)
        
        # วาด Bounding Box และบันทึกรูปภาพ
        annotated_filename = None
        try:
            annotated_img = results[0].plot()
            base_dir, filename = os.path.split(image_path)
            name, ext = os.path.splitext(filename)
            annotated_filename = f"{name}_annotated{ext}"
            annotated_path = os.path.join(base_dir, annotated_filename)
            cv2.imwrite(annotated_path, annotated_img)
        except Exception as e:
            print(f"⚠️ ไม่สามารถสร้างภาพ Bounding Box ได้: {e}")
        
        total_area_px = 0
        max_severity = 0
        damage_counts = {cls: 0 for cls in CLASSES}
        
        for box in results[0].boxes:
            class_id = int(box.cls[0].item())
            class_name = self.model.names[class_id]
            
            if class_name in damage_counts:
                damage_counts[class_name] += 1
                
            xmin, ymin, xmax, ymax = box.xyxy[0].tolist()
            area = (xmax - xmin) * (ymax - ymin)
            total_area_px += area
            
            weight = SEVERITY_WEIGHTS.get(class_name, 0)
            if weight > max_severity:
                max_severity = weight

        damage_ratio = round((total_area_px / image_area) * 100, 2)

        return {
            "cv_damage_ratio_percent": float(damage_ratio), 
            "cv_max_severity_score": int(max_severity),     
            "cv_total_defects_count": int(sum(damage_counts.values())),
            "cv_details": {k: int(v) for k, v in damage_counts.items()},
            "annotated_image_filename": annotated_filename
        }

    def calculate_priority_index(self, lat: float, lon: float, image_path: str, real_crowd_data: dict = None):
        """ทำ Late Fusion เพื่อหา Final Decision และ Risk Score"""
        cv_features = self.predict_damage(image_path)
        gee = get_environment_data(lat, lon)
        gis = get_road_type(lat, lon)
        crowd = real_crowd_data if real_crowd_data else get_crowdsource_data(lat, lon)
        
        cv_vector = [
            cv_features.get("cv_damage_ratio_percent", 0.0),
            cv_features.get("cv_max_severity_score", 0),
            cv_features.get("cv_total_defects_count", 0)
        ]

        rainfall = float(gee.get("rainfall_last_12m_mm", 0.0))
        soil_moisture = float(gee.get("soil_moisture_last_30d_mm", 0.0))
        ndvi_index = float(gee.get("ndvi_index", 0.0))
        road_material = gee.get("estimated_material", "ไม่ระบุ")
        report_count = int(crowd.get("crowdsource_report_count_30d", 0))

        road_type_map = {"highway": 3, "main": 2, "local": 1, "ไม่ทราบประเภท": 0}
        road_type_encoded = road_type_map.get(gis.get("thai_road_type", "ไม่ทราบประเภท"), 0)

        damage_score = (cv_vector[0] * 0.5) + (cv_vector[1] * 10) + (rainfall * 0.05) + (report_count * 2)

        if road_material == "ยางมะตอย (Asphalt)" and rainfall > 1000:
            damage_score += 15 
        if soil_moisture > 0.4:
            damage_score += 10
        if ndvi_index > 0.25:
            damage_score += 5

        if damage_score >= 50:
            final_decision = "Critical (ต้องซ่อมแซมด่วน)"
        elif damage_score >= 20:
            final_decision = "Warning (ควรเฝ้าระวัง)"
        else:
            final_decision = "Good (สภาพปกติ)"

        fusion_result = {
            "feature_vector": cv_vector + [rainfall, soil_moisture, ndvi_index, road_type_encoded],
            "fusion_score": float(damage_score),
            "final_decision": final_decision,
            "analysis_meta": {
                "is_high_risk_material": road_material == "ยางมะตอย (Asphalt)",
                "environmental_impact_factor": "high" if rainfall > 1200 or soil_moisture > 0.4 else "normal"
            }
        }

        return {
            "cv_features": cv_features,
            "context_data": {"gee": gee, "gis": gis, "crowdsource": crowd},
            "fusion_result": fusion_result
        }

# สร้าง Instance "ai_engine" รอไว้
ai_engine = PRIIGSAIEngine()