# สรุปภาพรวมระบบ Road Remaining Life Prediction & Priority System

เอกสารฉบับนี้จัดทำขึ้นเพื่อสรุปภาพรวมการทำงาน วัตถุประสงค์ สถาปัตยกรรมระบบ โครงสร้างไฟล์ และฟังก์ชันหลัก (Core Functions) ของโปรเจกต์ **Road Remaining Life Prediction System** (ระบบรายงาน สกัดคุณลักษณะ และประเมินลำดับความสำคัญการซ่อมแซมถนนด้วย AI Multi-Fusion)

---

## 1. ภาพรวมโปรเจกต์และวัตถุประสงค์ (Project Overview & Objectives)

### 📌 โปรเจกต์นี้คืออะไร?
โปรเจกต์นี้เป็น **ระบบสนับสนุนการตัดสินใจ (Decision Support System - DSS)** สำหรับการบริหารจัดการและประเมินสภาพความเสียหายของถนน โดยเปิดให้ประชาชนแจ้งเหตุความเสียหายของถนนผ่านเว็บแอปพลิเคชัน (ถ่ายรูป + ส่งพิกัด GPS) จากนั้นระบบหลังบ้านจะประมวลผลวิเคราะห์รูปภาพและสภาพแวดล้อมโดยรอบด้วยเทคโนโลยี **AI Multi-Fusion System** แบบอัตโนมัติ

### 🎯 วัตถุประสงค์หลัก (Core Objectives)
1. **คัดกรองข้อมูลขยะอัตโนมัติ (Gatekeeper Filter):** ตรวจสอบรูปภาพด้วย AI YOLO Classifier เพื่อกรองภาพที่ไม่เกี่ยวข้องกับถนนออกทันที ลดภาระงานของเจ้าหน้าที่
2. **วิเคราะห์ความเสียหายจากภาพถ่าย (Computer Vision):** ตรวจจับประเภทรอยแตก/หลุมบ่อ (D00, D10, D20, D40) ด้วย **RT-DETR** พร้อมคำนวณอัตราส่วนพื้นที่ความเสียหาย (% Damage Ratio) และระดับความรุนแรง (Severity Score)
3. **ผสานข้อมูลภูมิสารสนเทศ (Geo-Environmental & GIS Integration):** ดึงข้อมูลดาวเทียมย้อนหลังผ่าน **Google Earth Engine (GEE)** (ฝนสะสม, ความชื้นดิน, ดัชนีพืชพรรณ NDVI, ประเภทวัสดุถนน, ความลาดชัน) และข้อมูลสถิติ/โครงข่ายถนนจาก **OpenStreetMap (OSM/OSMnx)** (ประเภทถนน, จำกัดความเร็ว, ระยะห่างสถานที่สำคัญ เช่น โรงเรียน/โรงพยาบาล)
4. **จัดลำดับความสำคัญในการซ่อมแซม (Multi-Fusion Priority Index - PPI):** ประเมินคะแนนความเสี่ยงด่วนที่สุดเพื่อการซ่อมแซม โดยใช้วิธีตัดสินใจควบคู่กัน 3 รูปแบบ (Heuristic, Fuzzy Logic, Random Forest ML) และจัดกลุ่มระดับความเร่งด่วนเป็น `Critical` (วิกฤต), `Warning` (เฝ้าระวัง), และ `Good` (ปกติ)
5. **แสดงผลและบริหารจัดการผ่านแผนที่ GIS (Admin & Map Visualization):** ให้เจ้าหน้าที่บริหารจัดการรายงาน จัดลำดับความสำคัญ (Priority List) และดูแผนที่ความหนาแน่น/ความรุนแรง (Heatmap & Severity Map) ได้อย่างสะดวก

---

## 2. สถาปัตยกรรมระบบและโครงสร้างไฟล์ (System Architecture & File Structure)

### 🏗️ ภาพรวม Architecture
ระบบแบ่งออกเป็น 3 เลเยอร์หลักตามสถาปัตยกรรม **Client-Server Architecture**:

```
[ Frontend: React + Vite + Leaflet ]
                 │  (HTTP / REST API via Axios)
                 ▼
[ Backend: FastAPI (Python 3.10+) ]
  ├── 1. Router & Background Worker (Asynchronous Task Queue)
  ├── 2. Image Processing & Gatekeeper (YOLO Classifier)
  ├── 3. Defect Detection (RT-DETR Object Detection)
  ├── 4. Spatial Data Fetcher (GEE Satellite & OSMnx APIs)
  └── 5. Multi-Fusion Decision Engines (Heuristic, Fuzzy Logic, Random Forest ML)
                 │  (SQLAlchemy Async ORM)
                 ▼
[ Database & Storage: PostgreSQL + Uploads Directory ]
  ├── road_reports (ข้อมูลรายงานจากผู้ใช้)
  ├── ai_analyses (ผลการวิเคราะห์ AI & คะแนน PPI)
  └── api_cache_gee_osm (ระบบแคชข้อมูล API ภายนอก)
```

---

### 📁 โครงสร้างไฟล์และการเชื่อมโยง (File Structure & Relationships)

#### 🔹 1. โครงสร้างไฟล์หลังบ้าน (Backend - `/backend`)
- **[main.py](file:///c:/Users/User/Capstone_Project/backend/main.py):** จุดเริ่มต้นของ FastAPI Application 
  - จัดการ Lifespan Startup/Shutdown (เชื่อมฐานข้อมูล `init_db()`, ตั้งค่า GEE `init_gee()`, และโหลดโมเดล AI `ai_engine.load_model()`)
  - กำหนด CORS Middleware, Mount Static Route `/uploads` และลงทะเบียน API Routers (`reports_router`, `auth_router`)
- **`app/core/` (ส่วนประกอบหลักของระบบ):**
  - **[config.py](file:///c:/Users/User/Capstone_Project/backend/app/core/config.py):** อ่านค่าตั้งค่าระบบจากไฟล์ `.env` (DATABASE_URL, GEE Credentials, Upload Limits)
  - **[database.py](file:///c:/Users/User/Capstone_Project/backend/app/core/database.py):** สร้าง Async Engine และ AsyncSession สำหรับติดต่อ PostgreSQL ผ่าน `asyncpg`
  - **[file_utils.py](file:///c:/Users/User/Capstone_Project/backend/app/core/file_utils.py):** บันทึกไฟล์รูปภาพ สุ่มชื่อไฟล์เพื่อป้องกันชื่อซ้ำ และตรวจสอบความปลอดภัย
- **`app/reports/` (โมดูลจัดการรายงานและ API):**
  - **[models.py](file:///c:/Users/User/Capstone_Project/backend/app/reports/models.py):** ORM Models โครงสร้างฐานข้อมูล 3 ตารางหลัก (`RoadReport`, `AIAnalysis`, `ApiCacheGeeOsm`) และตารางผู้ใช้ (`User`, `ReportAction`, `SystemSetting`)
  - **[schemas.py](file:///c:/Users/User/Capstone_Project/backend/app/reports/schemas.py):** Pydantic Models สำหรับตรวจสอบข้อมูล Request/Response Payload
  - **[router.py](file:///c:/Users/User/Capstone_Project/backend/app/reports/router.py):** รวม API Endpoints หลัก (`/upload`, `/`, `/stats/summary`, `/map/points`, `/{id}`) และ Background Task `process_report_background`
- **`app/auth/` (โมดูลยืนยันตัวตนเจ้าหน้าที่):**
  - **[router.py](file:///c:/Users/User/Capstone_Project/backend/app/auth/router.py):** Endpoints เข้าสู่ระบบ (`/login`, `/me`) และ Dependency `get_current_admin`
  - **[models.py](file:///c:/Users/User/Capstone_Project/backend/app/auth/models.py) / [schemas.py](file:///c:/Users/User/Capstone_Project/backend/app/auth/schemas.py) / [utils.py](file:///c:/Users/User/Capstone_Project/backend/app/auth/utils.py):** ถอดและเข้ารหัสรหัสผ่าน (BCrypt) พร้อมสร้าง/ตรวจสอบ JWT Bearer Tokens
- **`app/ai/` (โมดูลประมวลผลปัญญาประดิษฐ์):**
  - **[engine.py](file:///c:/Users/User/Capstone_Project/backend/app/ai/engine.py):** คลาส `AIEngine` รวมท่อประมวลผล (Pipeline) ตั้งแต่การตรวจ Gatekeeper, RT-DETR Predict, รวบรวม Context data จนถึงคำนวณ Priority Index
  - **[fusion_engines.py](file:///c:/Users/User/Capstone_Project/backend/app/ai/fusion_engines.py):** คำนวณคะแนน PPI ผ่าน 3 ระบบ (`HeuristicFusionEngine`, `FuzzyFusionEngine`, `MLFusionEngine`)
  - **[gee_integration.py](file:///c:/Users/User/Capstone_Project/backend/app/ai/gee_integration.py):** เชื่อมต่อ Google Earth Engine และ OSMnx เพื่อสกัดสภาพแวดล้อม, ถนน, POIs
- **`app/services/` (บริการเสริม):**
  - **[gps_extractor.py](file:///c:/Users/User/Capstone_Project/backend/app/services/gps_extractor.py):** อ่านค่า EXIF Metadata จากไฟล์รูปถ่ายเพื่อสกัดพิกัด GPS
- **สคริปต์จัดการ DB:**
  - **[reset_db.py](file:///c:/Users/User/Capstone_Project/backend/reset_db.py):** สคริปต์ล้างและสร้างตาราง DB ใหม่
  - **[seed_admin.py](file:///c:/Users/User/Capstone_Project/backend/seed_admin.py):** สคริปต์สร้างบัญชีผู้ดูแลระบบเริ่มต้น

#### 🔹 2. โครงสร้างไฟล์หน้าบ้าน (Frontend - `/frontend`)
- **[src/App.jsx](file:///c:/Users/User/Capstone_Project/frontend/src/App.jsx):** ตั้งค่า React Router จัดเส้นทางหน้า User และ Admin
- **`src/pages/` (หน้าเว็บหลัก):**
  - **[UserDashboard.jsx](file:///c:/Users/User/Capstone_Project/frontend/src/pages/UserDashboard.jsx):** หน้าหลักสำหรับประชาชน แนะนำการใช้งานและดูสถิติ
  - **[UserReportPage.jsx](file:///c:/Users/User/Capstone_Project/frontend/src/pages/UserReportPage.jsx):** ฟอร์มสำหรับถ่ายภาพ/อัปโหลดภาพถนน เลือกตำแหน่งพิกัดบนแผนที่ และกดส่งรายงาน
  - **[AdminLoginPage.jsx](file:///c:/Users/User/Capstone_Project/frontend/src/pages/AdminLoginPage.jsx):** หน้าเข้าสู่ระบบสำหรับเจ้าหน้าที่
  - **[AdminDashboard.jsx](file:///c:/Users/User/Capstone_Project/frontend/src/pages/AdminDashboard.jsx):** สรุปภาพรวมสถิติรายงานสำหรับผู้ดูแลระบบ
  - **[AdminPriority.jsx](file:///c:/Users/User/Capstone_Project/frontend/src/pages/AdminPriority.jsx):** รายการจัดลำดับความสำคัญรายงานซ่อมถนนตาม Priority Score
  - **[AdminGISMap.jsx](file:///c:/Users/User/Capstone_Project/frontend/src/pages/AdminGISMap.jsx):** แผนที่แสดงจุดความเสียหาย (Severity Markers) และแผนที่ความหนาแน่น (Heatmap) ด้วย Leaflet
  - **[AdminReportDetail.jsx](file:///c:/Users/User/Capstone_Project/frontend/src/pages/AdminReportDetail.jsx):** หน้าดูรายละเอียดรายงาน ผลวิเคราะห์ AI ภาพตารางกรอบ Bounding Box และเปลี่ยนสถานะการซ่อมแซม
- **`src/services/` & `src/components/`:**
  - **[authService.js](file:///c:/Users/User/Capstone_Project/frontend/src/services/authService.js):** จัดการเก็บ JWT Token ใน LocalStorage
  - **[ProtectedRoute.jsx](file:///c:/Users/User/Capstone_Project/frontend/src/components/ProtectedRoute.jsx):** ป้องกันไม่ให้ผู้ใช้ที่ไม่ใช่ Admin แอบเข้าหน้าจัดการ

---

## 3. ฟังก์ชันหลัก (Core Functions) และหน้าที่การทำงาน

ฟังก์ชันของระบบสามารถแบ่งออกตามกระบวนการทำงาน (Pipeline Flow) ได้เป็น 5 กลุ่มหลัก ดังนี้:

```
[1. Receiving & GPS Extraction] -> [2. Gatekeeper & Vision AI] -> [3. Spatial Data & Caching] -> [4. Multi-Fusion Scoring] -> [5. Admin & GIS Management]
```

### 1️⃣ กลุ่มรับรายงานและสกัดพิกัด (Data Ingestion & GPS Extraction)
* **`save_upload_file(upload_file)` ([file_utils.py](file:///c:/Users/User/Capstone_Project/backend/app/core/file_utils.py)):**
  - **หน้าที่:** ตรวจสอบนามสกุลและขนาดไฟล์ บันทึกไฟล์รูปภาพลงโฟลเดอร์ `uploads/` พร้อมสุ่มชื่อไฟล์เพื่อความปลอดภัย
* **`extract_gps_from_exif(image_bytes)` ([gps_extractor.py](file:///c:/Users/User/Capstone_Project/backend/app/services/gps_extractor.py)):**
  - **หน้าที่:** อ่านข้อมูล EXIF แท็กในไฟล์รูปภาพ ถ้ารูปถ่ายเปิด GPS ไว้ จะแปลงค่าพิกัดองศา/ลิปดา/ฟิลิปดา (DMS) เป็นพิกัดทศนิยม (Decimal Degrees)
* **`upload_report(...)` ([router.py](file:///c:/Users/User/Capstone_Project/backend/app/reports/router.py)):**
  - **หน้าที่:** รับรูปถ่ายและพิกัดจากหน้าเว็บ (ถ้าผู้ใช้ไม่ได้แนบพิกัดมา จะใช้พิกัดที่สกัดได้จาก EXIF) บันทึกลงตาราง `road_reports` พร้อมสถานะ `processing` และส่งงานเข้าสู่ Background Task ทันทีเพื่อไม่ให้ผู้ใช้ต้องรอนาน

### 2️⃣ กลุ่มคัดกรองและประมวลผลภาพ (Gatekeeper & Computer Vision)
* **`validate_is_road(image_path)` ([engine.py](file:///c:/Users/User/Capstone_Project/backend/app/ai/engine.py)):**
  - **หน้าที่ (YOLO Gatekeeper):** นำภาพเข้าโมเดล `best-road-classifier.pt` เพื่อตรวจสอบว่าเป็นรูปภาพถนนจริงหรือไม่ หากไม่ใช่ถนน ระบบจะเปลี่ยนสถานะเป็น `REJECTED` ทันที
* **`predict_damage(image_path, threshold=0.30)` ([engine.py](file:///c:/Users/User/Capstone_Project/backend/app/ai/engine.py)):**
  - **หน้าที่ (RT-DETR Object Detection):** วิเคราะห์หารอยแผลบนถนน (D00: รอยแตกตามยาว, D10: รอยแตกตามขวาง, D20: รอยแตกหนังจระเข้, D40: หลุมบ่อ) คำนวณอัตราส่วนพื้นที่เสียหาย (`cv_damage_ratio_percent`), คะแนนความรุนแรงสูงสุด (`cv_max_severity_score`) และวาดกรอบ Bounding Box พร้อมบันทึกภาพผลลัพธ์ (`_annotated`)

### 3️⃣ กลุ่มดึงข้อมูลภูมิสารสนเทศและแคช (Spatial Data & Caching)
* **`init_gee()` ([gee_integration.py](file:///c:/Users/User/Capstone_Project/backend/app/ai/gee_integration.py)):**
  - **หน้าที่:** ตั้งค่าเชื่อมต่อ Google Earth Engine ด้วย Service Account Key (`Road-maintain.json`)
* **`get_environment_data(lat, lon)` ([gee_integration.py](file:///c:/Users/User/Capstone_Project/backend/app/ai/gee_integration.py)):**
  - **หน้าที่:** สอบถามข้อมูลดาวเทียมตามพิกัด ได้แก่:
    - Sentinel-2: คำนวณดัชนีพืชพรรณ (`ndvi_index`) และประเมินวัสดุผิวถนน (`Asphalt` หรือ `Concrete`)
    - CHIRPS: ปริมาณน้ำฝนสะสม 12 เดือนล่าสุด (`rainfall_last_12m_mm`)
    - SMAP: ความชื้นผิวดิน 30 วันย้อนหลัง (`soil_moisture_last_30d_mm`)
    - VIIRS: ความสว่างแสงไฟกลางคืน (`nightlight_radiance`)
    - SRTM DEM: ความลาดชัน (`slope_deg`) และระดับความสูง (`elevation_m`)
* **`get_road_type(lat, lon)` & `get_poi_data(lat, lon)` ([gee_integration.py](file:///c:/Users/User/Capstone_Project/backend/app/ai/gee_integration.py)):**
  - **หน้าที่:** ดึงประเภทถนน (Highway, Main, Local), เลน, ความเร็วจำกัด และสกัดสถานที่สำคัญใกล้เคียง (POIs เช่น โรงเรียน, โรงพยาบาล) จาก OpenStreetMap ผ่าน OSMnx เพื่อคำนวณคะแนนผลกระทบชุมชน (`community_impact_score_pi`)
* **`ApiCacheGeeOsm` Caching Mechanism ([router.py](file:///c:/Users/User/Capstone_Project/backend/app/reports/router.py)):**
  - **หน้าที่:** บันทึกข้อมูลที่ได้จาก GEE และ OSM ลงในตาราง `api_cache_gee_osm` ตาม Grid พิกัดทศนิยม 3 ตำแหน่ง (~110 เมตร) เพื่อป้องกันการเรียก API ซ้ำ ลด Latency และป้องกันปัญหา Rate Limit

### 4️⃣ กลุ่มประเมินและจัดลำดับความสำคัญ (Multi-Fusion Decision Engines)
* **`HeuristicFusionEngine.predict_ppi(data)` ([fusion_engines.py](file:///c:/Users/User/Capstone_Project/backend/app/ai/fusion_engines.py)):**
  - **หน้าที่:** คำนวณคะแนน Priority Score จากสูตรคณิตศาสตร์แบบ Rule-based (รวมคะแนนแผล ความรุนแรง ปริมาณฝน ความชื้นดิน วัสดุถนน และระยะห่าง POI)
* **`FuzzyFusionEngine.predict_ppi(data)` ([fusion_engines.py](file:///c:/Users/User/Capstone_Project/backend/app/ai/fusion_engines.py)):**
  - **หน้าที่:** คำนวณคะแนน Priority Score ด้วยตรรกศาสตร์คลุมเครือ (Fuzzy Logic Inference System) ผ่านชุดกฎ (Rules) และ Membership Functions
* **`MLFusionEngine.predict_ppi(data)` ([fusion_engines.py](file:///c:/Users/User/Capstone_Project/backend/app/ai/fusion_engines.py)):**
  - **หน้าที่:** ทำนายคะแนน Priority Score โดยใช้โมเดล Machine Learning (**Random Forest Regressor** `ppi_rf_model_v3.pkl`)
* **`calculate_priority_index(lat, lon, image_path, real_crowd_data)` ([engine.py](file:///c:/Users/User/Capstone_Project/backend/app/ai/engine.py)):**
  - **หน้าที่:** เป็นศูนย์กลางทำ **Late Fusion** รวบรวมข้อมูลทุกด้าน ตรวจสอบ Sanity Check (เช่น ค่า NDVI ไม่ตรงกับภาพถ่ายถนน) ส่งคำนวณคะแนนจากทั้ง 3 Engines และตัดสินใจสถานะสุดท้าย:
    - **`Critical`** (คะแนน $\ge 50$): ต้องได้รับการซ่อมแซมด่วน
    - **`Warning`** (คะแนน $20 - 49$): ควรเฝ้าระวัง
    - **`Good`** (คะแนน $< 20$): สภาพปกติ
    - **`Rejected`**: ข้อมูลถูกปฏิเสธเนื่องจากผิดเงื่อนไข/ไม่ใช่รูปถนน

### 5️⃣ กลุ่มบริหารจัดการเจ้าหน้าที่และแผนที่ GIS (Admin & GIS Mapping)
* **`get_map_points(include_rejected, db)` ([router.py](file:///c:/Users/User/Capstone_Project/backend/app/reports/router.py)):**
  - **หน้าที่:** ดึงรายการพิกัด ละติจูด ลองจิจูด ระดับความเสียหาย (`damage_level`) เพื่อส่งให้หน้าเว็บแสดงผลแผนที่ Heatmap และ Marker
* **`update_report_status(report_id, body, db)` ([router.py](file:///c:/Users/User/Capstone_Project/backend/app/reports/router.py)):**
  - **หน้าที่:** อัปเดตสถานะของรายงาน เช่น เปลี่ยนจาก `completed` เป็น `rejected` หรือสถานะการดำเนินการซ่อมแซม
* **`admin_login(...)` & `get_current_admin(...)` ([auth/router.py](file:///c:/Users/User/Capstone_Project/backend/app/auth/router.py)):**
  - **หน้าที่:** ตรวจสอบรหัสผ่านของแอดมิน สร้าง JWT Access Token และทำหน้าที่เป็น Dependency เพื่อรักษาความปลอดภัยของ API ฝั่งผู้ดูแลระบบ

---

## 4. สรุปภาพรวมการทำงานของระบบ (End-to-End Workflow Summary)

```
[ผู้ใช้สแกน/แนบรูปถ่ายถนน]
           │
           ▼
[อัปโหลดขึ้น FastAPI Router (/api/reports/upload)] ──► (ตอบกลับผู้ใช้ทันที: 201 Created Status: processing)
           │
           ▼ (Background Worker เริ่มทำงาน)
[1. EXIF Extractor]: ดึงพิกัด Lat/Lon จากภาพถ่าย
           │
           ▼
[2. YOLO Gatekeeper]: ตรวจสอบว่าเป็นรูปถนนหรือไม่?
           ├─► (ไม่ใช่ถนน) ──► บันทึกสถานะ `REJECTED` ──► จบการทำงาน
           └─► (เป็นรูปถนน) ──► ไปขั้นตอนถัดไป
           │
           ▼
[3. RT-DETR Vision AI]: ตรวจจับรอยแตก D00-D40, คำนวณ % พื้นที่เสียหาย, สร้างภาพ annotated
           │
           ▼
[4. Spatial Fetcher (GEE & OSM)]: ดึงปริมาณฝน, ความชื้นดิน, NDVI, ประเภทถนน, POIs (เช็ค Cache ก่อน)
           │
           ▼
[5. Multi-Fusion Engines]: ประมวลผลคะแนน PPI (Heuristic, Fuzzy, ML)
           │
           ▼
[6. Database Update]: บันทึกข้อมูล AIAnalysis และเปลี่ยนสถานะรายงานเป็น `COMPLETED` / `CRITICAL` / `WARNING`
           │
           ▼
[7. Admin Portal]: เจ้าหน้าที่เปิดดู Dashboard, Priority List, และ Heatmap บนระบบ GIS
```


---

## Community-Aware Spatial Priority (CASP)

### ภาพรวม
พัฒนาระบบ Dashboard เจ้าหน้าที่ให้สามารถวิเคราะห์ความเร่งด่วนของพื้นที่จากการแจ้งซ้ำของประชาชน  
โดยยังคงใช้ **PPI เป็นคะแนนหลัก** และ **ห้ามแก้ไขกระบวนการคำนวณ PPI เดิม**

---

### สูตรคำนวณ

```
Community Urgency Score (CUS) = 0.4×C + 0.3×D + 0.3×R

Overall Priority = 0.8 × PPI + 0.2 × CUS
```

| ตัวแปร | ความหมาย | น้ำหนัก |
|---|---|---|
| C (Count Score) | จำนวน Report ใน Grid (normalize 0–100) | 40% |
| D (Density Score) | ความหนาแน่นของ Report ต่อพื้นที่ Grid | 30% |
| R (Recency Score) | น้ำหนักความใหม่ของ Report | 30% |
| PPI | คะแนนจาก AI Multi-Fusion System เดิม | 80% |
| CUS | Community Urgency Score | 20% |

**ระดับ Overall Priority:**  
`Critical (≥75)` → `High (≥50)` → `Medium (≥25)` → `Low (<25)`

---

### Design Decisions

#### 1. Grid System → Fixed Grid
- **Study Area กำหนดล่วงหน้า** (ขอบเขตพื้นที่ศึกษาตายตัว)
- Grid ขนาดประมาณ **100 × 100 เมตร**
- ทุก Report ถูก assign เข้า Grid ตาม Lat/Lon
- **Grid ID คงที่** (ไม่เปลี่ยนตาม Report ที่เพิ่มขึ้น)

#### 2. Recency Score → Exponential Decay
```
R(t) = e^(-t/30)
```
- `t` = จำนวนวันนับจากวันที่แจ้ง Report ถึงปัจจุบัน
- `τ = 30 วัน` (Report อายุ 30 วัน มีน้ำหนัก ≈ 37% ของ Report ใหม่)
- Report ใหม่ (t=0) → R = 1.0
- Report อายุ 30 วัน → R ≈ 0.37
- Report อายุ 60 วัน → R ≈ 0.14

#### 3. Backend API → Endpoint ใหม่แยกต่างหาก
- **สร้าง endpoint ใหม่:** `GET /api/analytics/grid-priority`
- คำนวณทั้งหมดฝั่ง Backend
- **ไม่ยัด Grid Analytics เข้า** `GET /api/reports` หรือ `GET /api/reports/map/points`  
  (เพราะ endpoint เหล่านั้นมีหน้าที่เดิมอยู่แล้ว)

#### 4. Frontend → แบ่งงานตาม Component
| ไฟล์ | หน้าที่ |
|---|---|
| `AdminDashboard.jsx` | Overview + Grid Priority Summary + Top Priority Areas |
| `AdminGISMap.jsx` | Interactive Grid Map + รายละเอียด Grid เมื่อคลิก |
| `AdminPriority.jsx` | รายการจัดอันดับ Grid/พื้นที่ตาม Overall Priority |

---

### ขั้นตอนการพัฒนา (12 Steps)

1. ✅ ดึงข้อมูล Road Report ที่มี Latitude, Longitude และ Created Time จากฐานข้อมูล
2. ✅ แบ่งพื้นที่ศึกษาเป็น Fixed Grid ขนาด 100×100 เมตร และ Assign Report แต่ละรายการเข้า Grid
3. ✅ คำนวณจำนวน Report ของแต่ละ Grid และ Normalize เป็น Count Score (C) 0–100
4. ✅ คำนวณ Report Density Score (D) ของแต่ละ Grid
5. ✅ คำนวณ Recency Score (R) ด้วยสูตร `R(t) = e^(-t/30)`
6. ✅ คำนวณ Community Urgency Score ด้วยสูตร `CUS = 0.4C + 0.3D + 0.3R`
7. ✅ ดึง PPI เดิมของพื้นที่ **(ไม่แตะกระบวนการคำนวณ PPI เดิม)**
8. ✅ คำนวณ `Overall Priority = 0.8(PPI) + 0.2(CUS)`
9. ✅ จัดระดับ Overall Priority เป็น Critical / High / Medium / Low
10. ✅ แสดงผล Priority ของแต่ละพื้นที่บน GIS Map (`AdminGISMap.jsx`) — GridLayer + Legend
11. ✅ เพิ่มข้อมูล CUS, จำนวน Report และ Overall Priority ในรายละเอียดของพื้นที่ (Popup คลิก Grid)
12. ✅ ปรับ Priority List ให้เรียงตาม Overall Priority (`AdminPriority.jsx`) — Tab: Grid Priority (CASP)

---

### Workflow

```
ประชาชนแจ้งปัญหา
        ↓
เก็บ GPS + เวลา
        ↓
จัด Report เข้า Fixed Grid (100×100m)
        ↓
┌──────────────────────────┐
│ วิเคราะห์พื้นที่         │
│                          │
│ • Count Score  (C)       │
│ • Density Score (D)      │
│ • Recency Score (R)      │
│   R(t) = e^(-t/30)       │
└────────────┬─────────────┘
             ↓
   CUS = 0.4C + 0.3D + 0.3R
             ↓
       ┌─────┴─────┐
       │           │
      PPI         CUS
    (80%)        (20%)
       │           │
       └─────┬─────┘
             ↓
  Overall Priority = 0.8×PPI + 0.2×CUS
             ↓
    Critical / High / Medium / Low
             ↓
      ┌──────┴──────────┐
      ↓                 ↓
AdminGISMap       AdminPriority
(Interactive      (Priority List
 Grid Map)         Ranked)
      ↑
AdminDashboard
(Overview + Top Priority Areas)
```