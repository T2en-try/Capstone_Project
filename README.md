# Road Remaining Life Prediction System

## สมาชิกผู้จัดทำ
1. นายวัชรเกียรติ พิทักษา รหัสนักศึกษา B6613969
2. นายวชิระ แก้วเมือง รหัสนักศึกษา B6612726
3. นายพชร โจชัวร์ คริกเค รหัสนักศึกษา B6608972
4. นายธนภัทร เงินเส็ง รหัสนักศึกษา B6618520

## อาจารย์ที่ปรึกษา
รองศาสตราจารย์ ดร. ปรเมศวร์ห่อแก้ว

## ภาพรวมโปรเจกต์ (Project Overview)

ระบบทำนายอายุการใช้งานคงเหลือของถนน — เว็บแอปที่ให้ผู้ใช้ทั่วไปอัปโหลดรูปถนนที่ชำรุด และให้ผู้ดูแลระบบ (Admin) ตรวจสอบคะแนนความเร่งด่วนในการซ่อมที่ประเมินโดย AI ผ่าน Dashboard ประกอบด้วย 3 ส่วนหลัก: `backend/` (FastAPI + AI Inference), `frontend/` (React + Vite), `nginx/` (reverse proxy สำหรับ Docker stack)

## Prerequisites

| อะไร | เวอร์ชันที่ยืนยันว่าใช้งานได้จริง | หมายเหตุ |
|---|---|---|
| Python | 3.11 (ทดสอบใช้งานจริงบน local dev) | CI pin ไว้ที่ 3.10, Docker image ใช้ 3.12 — ทั้งสามใช้งานได้ ไม่ต้องยึดติดเวอร์ชันเดียว |
| Node.js | 20 | ตรงกันทั้ง CI และ Docker |
| PostgreSQL | 17 (ทดสอบใช้งานจริงบน local dev) | Docker's `db` service ใช้ `postgres:15-alpine` — ต่างเวอร์ชันกันได้ ไม่มีปัญหา compatibility ที่ทราบ |

## วิธีการติดตั้งและตั้งค่าระบบ (Installation & Setup)

ระบบ AI และ Backend มีไฟล์บางส่วนที่ไม่สามารถอัปโหลดขึ้น GitHub ได้ (เช่น ไฟล์โมเดลขนาดใหญ่, รหัสผ่าน, ไฟล์ Credentials, และ cache ข้อมูลแผนที่) คุณจำเป็นต้องดาวน์โหลด/สร้างไฟล์เหล่านี้เองก่อนจึงจะสามารถรันระบบได้

### 1. การเตรียมโฟลเดอร์และไลบรารี

```bash
git clone [YOUR_REPO_LINK]
cd backend
python -m venv venv && venv\Scripts\activate     # Windows; source venv/bin/activate บน Mac/Linux
pip install -r requirements.txt
```

### 2. ไฟล์ Credentials และ Secrets — ต้องสร้างเองหรือขอจากทีม ห้าม commit ขึ้น git เด็ดขาด

* **`backend/.env`** (ไฟล์ตั้งค่าระบบและฐานข้อมูล) — copy จาก `backend/.env.example` แล้วกรอกค่าจริง:
  * `JWT_SECRET_KEY` — **สร้างใหม่เองในเครื่องตัวเอง ห้ามขอ/แชร์ค่าจากคนอื่น**:
    ```bash
    python -c "import secrets; print(secrets.token_hex(32))"
    ```
    (ทุกคนในทีมสร้างค่าของตัวเองแยกกันได้ ไม่จำเป็นต้องใช้ค่าเดียวกัน — ใช้แค่เซ็น JWT token ของเครื่องตัวเอง)
  * `DATABASE_URL` — ชื่อฐานข้อมูลต้องเป็น **`road_reports_batch_db`** (ดูหัวข้อ "การตั้งค่าฐานข้อมูล" ด้านล่าง — ห้ามใช้ `road_reports_db` เฉยๆ เพราะเป็นฐานข้อมูลเก่าที่เลิกใช้แล้ว มีแค่ 12 แถว ไม่ตรงกับ schema ปัจจุบัน รายละเอียดใน `docs/production_migration_log.md`)
  * `GEE_SERVICE_ACCOUNT` / `GEE_PROJECT_ID` — ขอจากทีม (ค่าจริงผูกกับ Google Earth Engine service account ด้านล่าง)

* **ไฟล์ `Road-maintain.json`** (Google Earth Engine Service Account Credentials) — เป็น credential จริง ห้าม commit
  * **ดาวน์โหลด:** https://drive.google.com/file/d/178Pdqw8FzfZYQXhCyU6OI5c6fkjQk3aP/view?usp=drive_link
  * **ตำแหน่งที่ต้องวาง:** `backend/app/services/Road-maintain.json`

### 3. ไฟล์โมเดล AI (Machine Learning Weights) — ไฟล์ใหญ่ ขอจากทีม/ดาวน์โหลดตาม link

โมเดลเหล่านี้มีขนาดใหญ่และไม่ได้ถูกเก็บไว้ใน GitHub:

* **`best.pt`** (RT-DETR สำหรับตรวจจับความเสียหาย, ~66MB)
  * **ดาวน์โหลด:** https://drive.google.com/file/d/1f4h86pTPI3jfmHMdIrGkJkLTVxnEQ-Hi/view?usp=drive_link
  * **ตำแหน่งที่ต้องวาง:** `backend/models/best.pt`
* **`best-road-classifier.pt`** (YOLO classifier คัดกรองว่าเป็นรูปถนนจริงหรือไม่ — "Gatekeeper", ~2.8MB)
  * **ดาวน์โหลด:** https://drive.google.com/file/d/15kjcDslmFC6e53miRMqkXPjmv6S1Vzxx/view?usp=drive_link
  * **ตำแหน่งที่ต้องวาง:** `backend/best-road-classifier.pt` **(⚠️ อยู่ที่ root ของ `backend/` โดยตรง ไม่ใช่ใน `backend/models/` — โค้ดอ่าน path แบบ cwd-relative จากตำแหน่งที่รัน `uvicorn`, path เดิมในเอกสารนี้ผิด แก้ไขแล้ว)**
* **`priority_class_rf_v1.pkl`** (Random Forest Decision Head — โมเดลที่ใช้จริงในการตัดสิน priority_class/confidence_score ปัจจุบัน, ~2.4MB)
  * **ตำแหน่งที่ต้องวาง:** `backend/models/priority_class_rf_v1.pkl`
  * ขอไฟล์นี้จากทีม (โมเดลใหม่ ยังไม่มี Drive link แชร์ไว้ในเอกสารนี้ — เพิ่มเข้ามาทีหลังตอนย้ายจาก synthetic-trained model ไปเป็นโมเดลที่ผ่านการ validate จริง รายละเอียดใน `docs/production_migration_log.md`)
* **`ppi_rf_model_v3.pkl`** (โมเดลเก่า — ยังคงถูกอ่านโดย `MLFusionEngine` เป็นค่า informational เท่านั้น ไม่ใช่ตัวตัดสินใจหลักอีกต่อไป, ~4.8MB)
  * **ตำแหน่งที่ต้องวาง:** `backend/ppi_rf_model_v3.pkl` **(⚠️ อยู่ที่ root ของ `backend/` เช่นกัน ไม่ใช่ `backend/models/`)**
  * ถ้าไม่มีไฟล์นี้ แอปจะ auto-train โมเดล synthetic ทดแทนตอน startup (ทำงานได้ แต่เป็นแค่ค่า informational side-score ไม่กระทบผลลัพธ์หลัก)

### 4. ไฟล์ Cache ข้อมูลแผนที่ (GIS Caches) — ไฟล์ใหญ่ ขอจากทีม

ไฟล์เหล่านี้ backend อ่านโดยตรงตอนรันจริง (`gee_integration.py`) — ถ้าไม่มี ระบบจะยังรันได้แต่ข้อมูลถนน/ระยะทาง/เขตปกครองจะว่างเปล่า (ไม่ crash แค่ context หายไป):

* `backend/cached_driving_network.parquet` (~1.6MB)
* `backend/cached_pois.parquet` (~25KB)
* `backend/cached_admin_boundaries.parquet` (~91MB)

ขอไฟล์เหล่านี้จากทีมโดยตรง (ไฟล์เล็กพอที่จะแชร์ผ่าน Drive/USB ได้) — **ไม่แนะนำให้ build ใหม่เองถ้าไม่จำเป็น** เพราะต้องดาวน์โหลด `thailand-latest.osm.pbf` (~325MB) มาก่อน แล้วรัน `backend/scripts/build_gis_cache.py` และ `build_admin_boundary_cache.py` ซึ่งใช้เวลานานและกินทรัพยากรมาก

### 5. Environment Variables — รายชื่อ key ทั้งหมดที่ต้องมี (ไม่มีค่าจริงในไฟล์นี้)

**`backend/.env`** (copy จาก `backend/.env.example`):

| Key | จำเป็นหรือไม่ | คำอธิบาย |
|---|---|---|
| `DATABASE_URL` | **จำเป็น** — แอปจะไม่ start ถ้าไม่มี | ต้องชี้ไปที่ `road_reports_batch_db` |
| `JWT_SECRET_KEY` | **จำเป็น** — แอปจะไม่ start ถ้าไม่มี | สร้างเองในเครื่อง (คำสั่งด้านบน) |
| `HOST` | มีค่า default (`0.0.0.0`) | |
| `PORT` | มีค่า default (`8000`) | |
| `UPLOAD_DIR` | มีค่า default (`./uploads`) | |
| `MAX_FILE_SIZE_MB` | มีค่า default (`10`) | |
| `ALLOWED_ORIGINS` | มีค่า default | CORS whitelist, comma-separated |
| `GEE_SERVICE_ACCOUNT` | ไม่มีก็รันได้ แต่ GEE features จะ disable | |
| `GEE_KEY_PATH` | ไม่มีก็รันได้ แต่ GEE features จะ disable | ค่า default ชี้ไปที่ `./app/services/Road-maintain.json` อยู่แล้ว |
| `GEE_PROJECT_ID` | ไม่มีก็รันได้ แต่ GEE features จะ disable | |

**`frontend/.env`** (optional — copy จาก `frontend/.env.example` ถ้าต้องการ override ค่า default):

| Key | จำเป็นหรือไม่ | คำอธิบาย |
|---|---|---|
| `VITE_API_BASE_URL` | Optional (default: same-origin ผ่าน Vite proxy) | |
| `VITE_DEV_PROXY_TARGET` | Optional (default: `http://127.0.0.1:8000`) | |

### 6. การตั้งค่าฐานข้อมูล (Database Setup)

1. ติดตั้ง PostgreSQL แล้วสร้างฐานข้อมูลชื่อ **`road_reports_batch_db`** (ต้องใช้ชื่อนี้ตรงๆ — ดู `docs/production_migration_log.md` สำหรับที่มาว่าทำไมชื่อฐานข้อมูลถึงสำคัญ: โปรเจกต์นี้เคยมีฐานข้อมูล 2 ตัวพร้อมกัน (`road_reports_db` ที่เลิกใช้แล้วกับ 12 แถว vs `road_reports_batch_db` ที่ใช้งานจริงกับข้อมูลหลักพันแถว) และ schema เคย drift ระหว่าง `models.py` กับฐานข้อมูลจริงมาแล้ว 2 ครั้ง — เอกสารนี้บันทึกไว้เพื่อไม่ให้เกิดซ้ำ)
2. ถ้าเป็นฐานข้อมูลใหม่ (ว่างเปล่า) **ไม่ต้องรัน migration ใดๆ เพิ่มเติม** — ตอน backend start ครั้งแรก `init_db()` จะสร้างตารางทั้งหมดให้อัตโนมัติตาม `models.py` ปัจจุบัน (รวมถึง normalized satellite tables ของ `AIAnalysis` และคอลัมน์ `rejection_reason` ที่เพิ่งเพิ่มเข้ามา)
3. สร้าง admin account เริ่มต้น (จำเป็น เพราะ `init_db()` สร้างแค่ตาราง ไม่ใส่ข้อมูล):
   ```bash
   python seed_admin.py
   # สร้าง admin@roadmonitor.com / admin1234
   ```
4. ถ้าต้องการล้างฐานข้อมูลทั้งหมดแล้วเริ่มใหม่ (⚠️ ลบข้อมูลทั้งหมด):
   ```bash
   python scripts/reset_db.py
   ```

### 7. การรันเซิร์ฟเวอร์

**สำหรับ Backend:**
```bash
cd backend
python -m uvicorn main:app --reload
# http://127.0.0.1:8000, API docs ที่ /docs
```

**สำหรับ Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Known Issues

* **Docker Compose backend service ไม่ผ่าน `JWT_SECRET_KEY` เข้าไปใน container** — `docker-compose.yml`'s `backend.environment` ส่งแค่ `DATABASE_URL`/`CLOUD_*` แต่ `config.py` ต้องการ `JWT_SECRET_KEY` เสมอ (raise error ถ้าไม่มี) ผลคือ **ตอนนี้ backend container จะ start ไม่ขึ้นถ้ารันผ่าน `docker compose up`** ยังไม่ได้แก้ในรอบนี้เพราะทีมยังไม่ได้ deploy จริง — ใครหยิบงาน Docker deployment ขึ้นมาทำต่อ ต้องเพิ่ม `JWT_SECRET_KEY: ${JWT_SECRET_KEY}` เข้าไปใน `docker-compose.yml`'s backend service ก่อน ถึงจะรันได้
