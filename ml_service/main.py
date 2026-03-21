from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
import uvicorn
import cv2
import numpy as np
import torch
import os 

# สมมติว่าคุณแยกฟังก์ชันต่างๆ ไว้ในไฟล์ ai_model.py และ context_api.py
from ai_model import load_trained_model, extract_cv_features
from context_api import get_environment_data, get_road_type, get_crowdsource_data

app = FastAPI(title="Road Remaining Life Prediction API")

# 1. โหลดโมเดลเตรียมไว้ในหน่วยความจำตอนเริ่มเซิร์ฟเวอร์
MODEL_PATH = 'faster_rcnn_road_damage_final.pth'

if not os.path.exists(MODEL_PATH):
    print("❌ ERROR: ไม่พบไฟล์สมอง AI!")
    print("👉 กรุณาดาวน์โหลดไฟล์โมเดลจาก Google Drive และนำมาวางไว้ในโฟลเดอร์ ml_service")
    print("👉 ลิงก์ดาวน์โหลด: [ใส่ลิงก์ Google Drive ของคุณตรงนี้]")
    exit(1) # สั่งปิดระบบทันทีเพื่อไม่ให้เกิด Error ซับซ้อน
    
model, device = load_trained_model(MODEL_PATH)
print("✅ AI Model Loaded Successfully!")

# 2. ฟังก์ชันคำนวณ Priority Score (จากที่เราคุยกัน)
def calculate_priority_score(cv_data, gis_data, gee_data, crowd_data):
    total_score = 0
    explain_reasons = []
    
    # คำนวณ CV Score
    max_severity = cv_data.get('cv_max_severity_score', 0)
    damage_ratio = cv_data.get('cv_damage_ratio_percent', 0)
    base_ai_score = (max_severity * 5)
    
    if damage_ratio > 30:
        base_ai_score += 25
        explain_reasons.append("ตรวจพบความเสียหายระดับรุนแรงและกินพื้นที่บริเวณกว้าง")
    else:
        base_ai_score += 10
        explain_reasons.append("ตรวจพบความเสียหายเฉพาะจุด")
        
    total_score += min(base_ai_score, 50)

    # คำนวณ GIS (Road Type)
    road_type = gis_data.get('osm_highway_type', '')
    road_score = 15 if road_type in ['primary', 'trunk', 'motorway'] else (10 if road_type in ['secondary', 'tertiary'] else 5)
    if road_score == 15:
        explain_reasons.append("เป็นเส้นทางคมนาคมหลัก สัญจรหนาแน่น")
        
    total_score += min(road_score, 20)

    # คำนวณ GEE & Crowdsource
    reports = crowd_data.get('crowdsource_report_count_30d', 0)
    if reports > 0:
        total_score += min(reports * 4, 20)
        explain_reasons.append(f"มีประชาชนแจ้งเหตุซ้ำจำนวน {reports} ครั้ง")
        
    rain = gee_data.get('rainfall_last_12m_mm', 0)
    if rain > 1500:
        total_score += 10
        explain_reasons.append("สภาพแวดล้อมมีความชื้นสะสมสูง เสี่ยงต่อการทรุดตัวเพิ่ม")

    priority_level = "🟢 ต่ำ (เฝ้าระวัง)"
    if total_score >= 80: priority_level = "🔴 วิกฤต (ต้องซ่อมทันที)"
    elif total_score >= 50: priority_level = "🟡 ปานกลาง (วางแผนซ่อมบำรุง)"

    return {"score": total_score, "level": priority_level, "reasons": explain_reasons}

# 3. สร้าง Endpoint รับข้อมูลจาก Frontend
@app.post("/predict_road_condition")
async def predict_road(
    latitude: float = Form(...),
    longitude: float = Form(...),
    image: UploadFile = File(...)
):
    try:
        # อ่านรูปภาพที่อัปโหลดเข้ามา
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
        height, width, _ = img_rgb.shape
        
        # 1. วิเคราะห์รูปภาพ (CV)
        image_tensor = torch.as_tensor(img_rgb.transpose(2, 0, 1), dtype=torch.float32).to(device) / 255.0
        with torch.no_grad():
            prediction = model([image_tensor])[0]
        cv_features = extract_cv_features(prediction, width, height)

        # 2. ดึงข้อมูลแวดล้อม (Contextual)
        gee_data = get_environment_data(latitude, longitude)
        gis_data = get_road_type(latitude, longitude)
        crowd_data = get_crowdsource_data(latitude, longitude)

        # 3. รวมร่างและคำนวณคะแนน (Late Fusion)
        final_result = calculate_priority_score(cv_features, gis_data, gee_data, crowd_data)

        # ตอบกลับเป็น JSON ให้ Frontend
        return JSONResponse(content={
            "status": "success",
            "priority": final_result,
            "cv_details": cv_features,
            "context_details": {
                "gee": gee_data,
                "gis": gis_data,
                "crowdsource": crowd_data
            }
        })

    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)