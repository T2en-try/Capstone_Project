# Road Remaining Life Prediction System

## สมาชิกผู้จัดทำ
1. นายวัชรเกียรติ พิทักษา รหัสนักศึกษา B6613969
2. นายวชิระ แก้วเมือง รหัสนักศึกษา B6612726
3. นายพชร โจชัวร์ คริกเค รหัสนักศึกษา B6608972
4. นายธนภัทร เงินเส็ง รหัสนักศึกษา B6618520

## อาจารย์ที่ปรึกษา
รองศาสตราจารย์ ดร. ปรเมศวร์ห่อแก้ว

## วิธีการติดตั้งและตั้งค่าระบบ (Installation & Setup)

ระบบ AI และ Backend มีไฟล์บางส่วนที่ไม่สามารถอัปโหลดขึ้น GitHub ได้ (เช่น ไฟล์โมเดลขนาดใหญ่, รหัสผ่าน, และไฟล์ Credentials) คุณจำเป็นต้องดาวน์โหลดไฟล์เหล่านี้มาวางในโปรเจกต์ด้วยตัวเองก่อนจึงจะสามารถรันระบบได้

### 1. การเตรียมโฟลเดอร์และไลบรารี
1. Clone โปรเจกต์ลงเครื่อง: `git clone [YOUR_REPO_LINK]`
2. เข้าไปที่โฟลเดอร์ Backend: `cd backend`
3. ติดตั้งไลบรารีที่จำเป็น: `pip install -r requirements.txt`

### 2. ไฟล์ตั้งค่าและ Credentials ที่ต้องดาวน์โหลด
กรุณาดาวน์โหลดไฟล์ด้านล่างนี้และนำไปวางในตำแหน่งที่ระบุ:

*   **ไฟล์ `.env`** (ไฟล์ตั้งค่าระบบและฐานข้อมูล)
    *   **ดาวน์โหลด:** [Download the file from here]
    *   **ตำแหน่งที่ต้องวาง:** `backend/.env` (ให้อยู่ระดับเดียวกับ `main.py`)
    *   *(ทางเลือก: สามารถก็อปปี้ไฟล์ `.env.example` แล้วเปลี่ยนชื่อเป็น `.env` พร้อมกรอกข้อมูลเองได้)*

*   **ไฟล์ `Road-maintain.json`** (Google Earth Engine Service Account Credentials)
    *   **ดาวน์โหลด:** [Download the file from here]
    *   **ตำแหน่งที่ต้องวาง:** `backend/app/services/Road-maintain.json`

### 3. ไฟล์โมเดล AI (Machine Learning Weights) ที่ต้องดาวน์โหลด
โมเดลเหล่านี้มีขนาดใหญ่และไม่ได้ถูกเก็บไว้ใน GitHub กรุณาดาวน์โหลดและนำไปวางในโฟลเดอร์ `backend/`:

*   **ไฟล์ `best.pt`** (โมเดล YOLO/RT-DETR สำหรับตรวจจับความเสียหาย)
    *   **ดาวน์โหลด:** [Download the file from here]
    *   **ตำแหน่งที่ต้องวาง:** `backend/best.pt`
*   **ไฟล์ `best-road-classifier.pt`** (โมเดลคัดกรองความถูกต้องของรูปภาพถนน)
    *   **ดาวน์โหลด:** [Download the file from here]
    *   **ตำแหน่งที่ต้องวาง:** `backend/best-road-classifier.pt`
*   **ไฟล์ `ppi_rf_model_v3.pkl`** (โมเดล Random Forest สำหรับคำนวณ Priority Score)
    *   **ดาวน์โหลด:** [Download the file from here]
    *   **ตำแหน่งที่ต้องวาง:** `backend/ppi_rf_model_v3.pkl`

### 4. การรันเซิร์ฟเวอร์
เมื่อวางไฟล์ทั้งหมดครบถ้วนแล้ว สามารถรันระบบได้ตามขั้นตอนดังนี้:

**สำหรับ Backend:**
1. ตรวจสอบว่าอยู่ในโฟลเดอร์ `backend`
2. รันเซิร์ฟเวอร์: `python -m uvicorn main:app --reload`

**สำหรับ Frontend:**
1. เปิด Terminal ใหม่ แล้วเข้าไปที่โฟลเดอร์ `frontend`: `cd frontend`
2. ติดตั้งแพ็กเกจ: `npm install`
3. รันหน้าเว็บ: `npm run dev`
