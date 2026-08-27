# ระบบหลังบ้าน (Backend) 

โปรเจกต์นี้คือระบบ Backend สำหรับจัดการและประเมินสภาพถนนด้วยเทคโนโลยี AI Multi-Fusion สถาปัตยกรรมของระบบประกอบไปด้วย:
1. **YOLO Gatekeeper**: โมเดลสำหรับคัดกรองรูปภาพว่าใช่ถนนหรือไม่ เพื่อลดภาระการประมวลผล
2. **RT-DETR (Computer Vision)**: โมเดลวิเคราะห์ความเสียหายและคำนวณสัดส่วนรอยแตก
3. **Google Earth Engine (GEE) & OpenStreetMap (OSM)**: ดึงข้อมูลสภาพแวดล้อม ภูมิประเทศ และสถานที่สำคัญ
4. **Multi-Fusion Engines**: ระบบช่วยตัดสินใจ (DSS) ที่ทำงานควบคู่กัน 3 รูปแบบ (Heuristic, Fuzzy Logic, Random Forest ML)
ทำตามคู่มือด้านล่างนี้เพื่อตั้งค่าโปรเจกต์และรันระบบในเครื่องของคุณ

---

## 1. สิ่งที่ต้องติดตั้งในเครื่อง (Prerequisites)

ก่อนเริ่มทำงาน ให้แน่ใจว่าในเครื่องของคุณติดตั้งโปรแกรมเหล่านี้ไว้แล้ว:
* **Python**: เวอร์ชัน `3.10` หรือใหม่กว่า
* **PostgreSQL**: เวอร์ชัน `14` หรือใหม่กว่า (ระบบของเราใช้ไดรเวอร์ `asyncpg` และเก็บข้อมูลบางส่วนเป็น `JSONB`)
* **Git**: สำหรับใช้ Clone โปรเจกต์นี้
* **การ์ดจอ NVIDIA (แนะนำ)**: ระบบรองรับการประมวลผลผ่าน CUDA เพื่อให้โมเดล RT-DETR ทำงานได้เร็วขึ้น (หากไม่มีการ์ดจอ ระบบจะใช้ CPU ซึ่งอาจจะใช้เวลาประมวลผลต่อภาพนานกว่าปกติ)

---

## 2. ไฟล์สำคัญที่ต้องขอจากทีม (Ignored Files)

เพื่อความปลอดภัยและข้อจำกัดเรื่องขนาดไฟล์ของ GitHub ระบบได้ตั้งค่า `.gitignore` ไม่ให้อัปโหลดไฟล์ที่มีขนาดใหญ่มากและไฟล์กุญแจส่วนตัว (Private Keys) ขึ้นบน Git 

**คุณต้องขอไฟล์ 4 ไฟล์นี้จากหัวหน้าทีมหรือแอดมิน และนำไปวางไว้ในโฟลเดอร์ให้ถูกต้องก่อนเริ่มระบบ:**

1. **`best.pt`** (ไฟล์โมเดล PyTorch ของ RT-DETR ขนาดประมาน 66MB)
   * ให้นำไปวางไว้ที่โฟลเดอร์ `/backend/models/`
2. **`best-road-classifier.pt`** (ไฟล์โมเดล YOLO สำหรับคัดกรองรูปภาพถนน ขนาดประมาน 3MB)
   * ให้นำไปวางไว้ที่โฟลเดอร์ `/backend/models/` (ถ้าย้ายมาด้วยกัน) หรือโฟลเดอร์ที่กำหนด
3. **`ppi_rf_model.pkl`** (ไฟล์โมเดล Random Forest ขนาดประมาน 2.5MB)
   * ให้นำไปวางไว้ที่โฟลเดอร์ `/backend/models/` (ถ้าย้ายมาด้วยกัน) หรือโฟลเดอร์ที่กำหนด
4. **`Road-maintain.json`** (ไฟล์ Google Cloud Service Account Key)
   * ให้นำไปวางไว้ในโฟลเดอร์ `/backend/app/services/`

---

## 3. การสร้างฐานข้อมูล (Database Setup)

คุณต้องสร้างฐานข้อมูล PostgreSQL เปล่าๆ เพื่อให้ระบบใช้งาน

1. เปิด PostgreSQL terminal (หรือใช้โปรแกรมจัดการเช่น pgAdmin / DBeaver)
2. รันคำสั่ง SQL สร้างฐานข้อมูลใหม่:
   ```sql
   CREATE DATABASE road_reports_db;
   ```
3. จำ `Username` และ `Password` ของ PostgreSQL ในเครื่องคุณไว้ เพื่อนำไปตั้งค่าในขั้นตอนถัดไป

---

## 4. การตั้งค่าตัวแปรสภาพแวดล้อม (Environment Config)

1. ทำการคัดลอกไฟล์ตัวอย่าง `.env.example` เพื่อสร้างไฟล์ `.env` ของคุณเอง:
   ```bash
   cp .env.example .env
   ```
   *(หรือคลิกขวา Copy/Paste แล้วเปลี่ยนชื่อเป็น `.env` ก็ได้)*
2. เปิดไฟล์ `.env` ขึ้นมาแก้ไขค่าต่างๆ:
   ```ini
   # ตั้งค่ารหัสผ่าน Database (เปลี่ยน <YOUR_PASSWORD> เป็นรหัสผ่านจริงในเครื่องของคุณ)
   DATABASE_URL=postgresql+asyncpg://postgres:<YOUR_PASSWORD>@localhost:5432/road_reports_db
   
   # ตั้งค่า Server
   HOST=0.0.0.0
   PORT=8000
   
   # ตั้งค่าที่เก็บไฟล์อัปโหลด
   UPLOAD_DIR=./uploads
   MAX_FILE_SIZE_MB=10

   # ตั้งค่า Allowed Origins สำหรับ CORS
   ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173
   
   # ตั้งค่า Google Earth Engine (ใส่ Email Service Account ของโปรเจกต์)
   GEE_SERVICE_ACCOUNT=your-service-account@your-project-id.iam.gserviceaccount.com
   GEE_KEY_PATH=./app/services/Road-maintain.json
   GEE_PROJECT_ID=your-google-cloud-project-id
   ```

---

## 5. การติดตั้งโปรแกรม (Installation)

ขอแนะนำให้ใช้ Virtual Environment เพื่อแยกไลบรารีของโปรเจกต์นี้ไม่ให้ตีกับโปรเจกต์อื่น

1. เปิด Terminal และเข้าไปที่โฟลเดอร์ backend:
   ```bash
   cd backend
   ```
2. สร้างและเปิดใช้งาน Python Virtual Environment:
   ```bash
   # สำหรับ Windows:
   python -m venv venv
   venv\Scripts\activate
   
   # สำหรับ Mac/Linux:
   python3 -m venv venv
   source venv/bin/activate
   ```
3. ติดตั้งไลบรารีทั้งหมดที่ระบุไว้ใน requirements.txt:
   ```bash
   pip install -r requirements.txt
   ```

---

## 6. การสร้างตารางในฐานข้อมูล (Database Initialization)

ก่อนเปิดใช้งานเซิร์ฟเวอร์ครั้งแรก เราต้องสร้างตารางในฐานข้อมูลก่อน ระบบมีสคริปต์อัตโนมัติในการสร้างตารางโครงสร้าง 3-Table Normalized

> **คำเตือน:** หากรันสคริปต์นี้ ข้อมูลเก่าในตาราง `road_reports_db` ของคุณจะถูกลบทิ้งทั้งหมด

สั่งรันสคริปต์สร้างตาราง:
```bash
python scripts/reset_db.py
```
หากสำเร็จ ระบบจะแสดงข้อความว่าตาราง `road_reports`, `ai_analyses`, และ `api_cache_gee_osm` สร้างเสร็จสมบูรณ์

---

## 6.5 การสร้าง GIS Cache (Road Type / Speed Limit / POI)

`get_road_type()` และ `get_poi_data()` ใน `app/ai/gee_integration.py` อ่านข้อมูลถนน/POI จากไฟล์
`cached_driving_network.parquet` และ `cached_pois.parquet` — ถ้าไม่มีไฟล์นี้ ระบบจะคืนค่า default
ทุกครั้งแบบเงียบๆ (`speed_limit=50.0`, `lanes=2`, `highway_type='unknown'`) โดยไม่มี error ใดๆ

1. ดาวน์โหลด OSM extract ของประเทศไทย (.osm.pbf) จาก
   [Geofabrik](https://download.geofabrik.de/asia/thailand.html) แล้ววางไว้ที่ `backend/data/thailand-latest.osm.pbf`
2. รันสคริปต์สร้าง cache (ต้องมี CSV ที่มีคอลัมน์ `latitude`/`longitude` ของชุดข้อมูลที่จะประมวลผล):
   ```bash
   python scripts/build_gis_cache.py --source-csv path/to/your_manifest.csv
   ```
3. ตรวจสอบ log บรรทัด `maxspeed tag coverage: X%` — ถ้าตัวเลขต่ำ แปลว่า field
   `speed_limit` จะ default เป็น 50.0 บ่อยครั้งสำหรับพื้นที่นั้น ควรรู้ไว้ก่อนใช้เป็น feature

---

## 7. วิธีเปิดรันเซิร์ฟเวอร์ (Running the Application)

เมื่อตั้งค่าทุกอย่างเสร็จสิ้นแล้ว คุณสามารถเปิดใช้งาน FastAPI เซิร์ฟเวอร์ได้ด้วยคำสั่ง:

```bash
uvicorn main:app --reload
```

* **URL ของ API**: `http://127.0.0.1:8000`
* **คู่มือ API (Swagger UI)**: `http://127.0.0.1:8000/docs`

ระบบจะทำการ Auto-reload ให้ทันทีเมื่อมีการแก้ไขไฟล์ Python ใดๆ

## 8. การใช้งาน API เบื้องต้น (API Endpoints)

* `POST /api/reports/upload`: อัปโหลดรูปภาพ ระบบจะสกัด GPS (หรือใช้จาก Body) จากนั้นส่งเข้าสู่ Gatekeeper, RT-DETR, ดึงข้อมูลจาก GEE/OSM, และประมวลผลคะแนน PPI ผ่าน Fusion Engines ทั้ง 3 แบบ คืนผลลัพธ์พร้อม URL รูปที่วาดกรอบความเสียหาย
* `GET /api/reports/`: ดึงประวัติการรายงานพร้อมข้อมูลที่ถูกวิเคราะห์แล้ว

---

## วิธีแก้ปัญหาเบื้องต้น (Troubleshooting)

* **อัปโหลดภาพแล้วระบบบอกว่าไม่ใช่ถนน (Gatekeeper Rejection)**: ระบบใช้ YOLO Classifier ในการเช็คว่าเป็นถนนหรือไม่ ถ้ารูปไม่ชัดหรือถ่ายติดสิ่งอื่นเยอะ ระบบจะปฏิเสธ (Rejected) เพื่อป้องกัน False Positive
* **Google Earth Engine Error**: ลองตรวจสอบดูว่าใส่อีเมลใน `GEE_SERVICE_ACCOUNT` ตรงกับไฟล์ JSON หรือไม่ และแน่ใจว่าวางไฟล์ `Road-maintain.json` ไว้ถูกที่ พร้อมระบุ `GEE_PROJECT_ID` ถูกต้อง
* **Database Connection Error**: เช็คให้ชัวร์ว่าเปิดใช้งาน PostgreSQL ไว้แล้ว (มักจะใช้พอร์ต 5432) และตรวจสอบรหัสผ่านในไฟล์ `.env` ว่าถูกต้อง
* **CORS Error**: หากเรียก API จาก Frontend แล้วติด CORS ให้ตรวจสอบว่า URL ของ Frontend ถูกเพิ่มลงใน `ALLOWED_ORIGINS` ภายในไฟล์ `.env` หรือยัง
* **หาไฟล์โมเดลไม่เจอ (Model Not Found)**: ตรวจสอบว่าได้นำไฟล์ `best.pt`, `best-road-classifier.pt` และ `ppi_rf_model.pkl` มาวางไว้ในโฟลเดอร์ `backend/models/` แล้วหรือไม่
