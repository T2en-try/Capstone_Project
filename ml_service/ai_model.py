import torch
import torchvision
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor

# 1. กำหนดรายชื่อคลาสให้ตรงกับตอนเทรนเป๊ะๆ
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
        "cv_damage_ratio_percent": float(damage_ratio), # แปลงเป็น float ปกติ
        "cv_max_severity_score": int(max_severity),     # แปลงเป็น int ปกติ
        "cv_total_defects_count": int(sum(damage_counts.values())),
        "cv_details": {k: int(v) for k, v in damage_counts.items()} # แปลงค่าใน dict เป็น int
    }