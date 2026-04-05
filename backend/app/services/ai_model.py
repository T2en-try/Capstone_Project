import torch
import torchvision
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor

# 1. กำหนดรายชื่อคลาสให้ตรงกับตอนเทรน
CLASSES = [
    'longitudinal crack', 'longitudinal crack wide',
    'transverse crack', 'transverse crack wide',
    'alligator crack', 'alligator crack sunken',
    'pothole', 'pothole deep'
]
NUM_CLASSES = 9  # 8 ความเสียหาย + 1 พื้นหลัง

def load_trained_model(weights_path):
    """
    ฟังก์ชันสำหรับสร้างโครงสร้าง Faster R-CNN และโหลด Weights ที่เทรนแล้ว
    """
    print("🧠 กำลังสร้างโครงสร้างโมเดล Faster R-CNN...")
    # โหลดโครงสร้างเปล่า (weights=None เพราะเราจะใส่ weights ของเราเอง)
    model = torchvision.models.detection.fasterrcnn_resnet50_fpn(weights=None)
    
    # ปรับแต่งหัว Classifier ให้ทำนายได้ 9 Classes ตามที่เราออกแบบไว้
    in_features = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = FastRCNNPredictor(in_features, NUM_CLASSES)
    
    print(f"📥 กำลังโหลดความจำ (Weights) จากไฟล์: {weights_path}")
    # เช็คว่าเครื่องที่รัน API มี GPU ไหม ถ้าไม่มีให้ใช้ CPU
    device = torch.device('cuda') if torch.cuda.is_available() else torch.device('cpu')
    
    # โหลด Weights ใส่โมเดล
    model.load_state_dict(torch.load(weights_path, map_location=device))
    model.to(device)
    
    # ตั้งค่าเป็นโหมดทดสอบ (Evaluation Mode) ปิดการอัปเดตน้ำหนัก
    model.eval() 
    
    return model, device

def extract_cv_features(prediction_result, image_width, image_height, threshold=0.5):
    """
    ฟังก์ชันแปลงผลลัพธ์ Bounding Box ให้กลายเป็นตัวเลข (Feature Vector)
    อ้างอิงน้ำหนักความอันตราย (Degree) จาก Objective AHP Paper
    """
    # กำหนดน้ำหนักความรุนแรง (ยิ่งลึก/กว้าง ยิ่งคะแนนสูง)
    severity_weights = {
        'longitudinal crack': 2, 'longitudinal crack wide': 3,
        'transverse crack': 2, 'transverse crack wide': 3,
        'alligator crack': 3, 'alligator crack sunken': 4,
        'pothole': 4, 'pothole deep': 5
    }
    
    total_area_px = 0
    max_severity = 0
    damage_counts = {cls: 0 for cls in CLASSES}
    
    # แกะค่าพิกัด, คลาส, และเปอร์เซ็นต์ความมั่นใจออกมา
    boxes = prediction_result['boxes'].cpu().numpy()
    labels = prediction_result['labels'].cpu().numpy()
    scores = prediction_result['scores'].cpu().numpy()
    
    for box, label, score in zip(boxes, labels, scores):
        # กรองเอาเฉพาะกล่องที่โมเดลมั่นใจผ่านเกณฑ์ (ค่าเริ่มต้นคือ 50%)
        if score >= threshold:
            class_name = CLASSES[label] if label < len(CLASSES) else str(label)
            
            # 1. นับจำนวนจุดที่พังแยกตามประเภท
            if class_name in damage_counts:
                damage_counts[class_name] += 1
            
            # 2. คำนวณพื้นที่ (กว้าง x ยาว) ของกล่อง
            xmin, ymin, xmax, ymax = box
            area = (xmax - xmin) * (ymax - ymin)
            total_area_px += area
            
            # 3. เก็บคะแนนความรุนแรงสูงสุดที่พบในรูปภาพนี้
            weight = severity_weights.get(class_name, 0)
            if weight > max_severity:
                max_severity = weight
                
    # คำนวณร้อยละของพื้นที่ความเสียหายต่อพื้นที่ถนนทั้งหมดในรูป (Extent)
    image_area = image_width * image_height
    damage_ratio = round((total_area_px / image_area) * 100, 2)

    return {
        "cv_damage_ratio_percent": float(damage_ratio), 
        "cv_max_severity_score": int(max_severity),     
        "cv_total_defects_count": int(sum(damage_counts.values())),
        "cv_details": {k: int(v) for k, v in damage_counts.items()} 
    }

def perform_late_fusion(cv_features, context_data):
    """
    ฟังก์ชันทำ Late Fusion และตัดสินใจ (Decision Layer)
    รวบรวมข้อมูลจาก Computer Vision และ Contextual Data (GEE, GIS, Crowdsource)
    """
    # 1. สกัดตัวเลขจากฝั่ง Computer Vision (CV)
    cv_vector = [
        cv_features.get("cv_damage_ratio_percent", 0.0),
        cv_features.get("cv_max_severity_score", 0),
        cv_features.get("cv_total_defects_count", 0)
    ]

    # 2. สกัดตัวเลขจากฝั่ง Contextual (ดึงจาก Key ล่าสุดใน Context_api.py)
    gee = context_data.get("gee", {})
    gis = context_data.get("gis", {})
    crowd = context_data.get("crowdsource", {})

    rainfall = float(gee.get("rainfall_last_12m_mm", 0.0))
    soil_moisture = float(gee.get("soil_moisture_last_30d_mm", 0.0))
    ndvi_index = float(gee.get("ndvi_index", 0.0))
    road_material = gee.get("estimated_material", "ไม่ระบุ")
    
    # Crowdsource info
    report_count = int(crowd.get("crowdsource_report_count_30d", 0))

    # Encoding ประเภทถนนจาก GIS
    road_type_map = {"highway": 3, "main": 2, "local": 1, "ไม่ทราบประเภท": 0}
    road_type_encoded = road_type_map.get(gis.get("thai_road_type", "ไม่ทราบประเภท"), 0)

    # 3. Decision Layer: คำนวณ Risk Score
    # สมการพื้นฐาน: (CV Score) + (Rainfall weight) + (Crowdsource weight)
    damage_score = (cv_vector[0] * 0.5) + (cv_vector[1] * 10) + (rainfall * 0.05) + (report_count * 2)

    # --- [Logic พิเศษสำหรับข้อมูล GEE ใหม่] ---
    
    # เงื่อนไข 1: วัสดุพื้นผิว (ยางมะตอยอ่อนแอกว่าคอนกรีตเมื่อเจอน้ำ)
    if road_material == "ยางมะตอย (Asphalt)" and rainfall > 1000:
        damage_score += 15 # บวกเพิ่มเพราะเสี่ยงต่อการเกิดหลุมบ่อ (Pothole) สูง
        
    # เงื่อนไข 2: ความชื้นดิน (Soil Moisture สูงอาจหมายถึงชั้นรองพื้นทางอ่อนตัว)
    if soil_moisture > 0.4:
        damage_score += 10
        
    # เงื่อนไข 3: NDVI (พืชพรรณหนาแน่นอาจมีปัญหาเรื่องรากไม้ชอนไชใต้ถนน)
    if ndvi_index > 0.25:
        damage_score += 5

    # 4. ฟันธงผลลัพธ์ (Final Classification)
    if damage_score >= 50:
        final_decision = "Critical (ต้องซ่อมแซมด่วน)"
    elif damage_score >= 20:
        final_decision = "Warning (ควรเฝ้าระวัง)"
    else:
        final_decision = "Good (สภาพปกติ)"

    return {
        "feature_vector": cv_vector + [rainfall, soil_moisture, ndvi_index, road_type_encoded],
        "fusion_score": float(damage_score),
        "final_decision": final_decision,
        "analysis_meta": {
            "is_high_risk_material": road_material == "ยางมะตอย (Asphalt)",
            "environmental_impact_factor": "high" if rainfall > 1200 or soil_moisture > 0.4 else "normal"
        }
    }