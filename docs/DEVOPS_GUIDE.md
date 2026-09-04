# DevOps Guide — Testing / CI-CD / Deployment

เอกสารนี้เขียนไว้สำหรับคนที่รับงาน Testing, CI/CD, และ Deployment ของโปรเจกต์นี้ต่อ
สรุปจากการอ่านโค้ดจริงในโปรเจกต์ ณ ตอนที่เขียน (ไม่ใช่แผนในอนาคต) — ถ้าอะไรยังไม่ได้ทำ จะบอกตรงๆ ว่ายังไม่ได้ทำ ไม่ implied ว่ามีมากกว่าที่มีจริง

---

## 1. สถานะปัจจุบัน: อะไร automated แล้ว vs. อะไรยังต้องทำมือ

### Automated (มี CI config อยู่แล้ว)

มี GitHub Actions workflow อยู่ 2 ไฟล์ใน `.github/workflows/`:

| ไฟล์ | Trigger | ทำอะไร |
|---|---|---|
| `ci.yml` ("Automation Tests") | **`workflow_dispatch` เท่านั้น** (manual trigger, ไม่รันอัตโนมัติตอน push/PR) | 2 jobs: `backend-tests` (pytest) + `frontend-build` (lint + build) |
| `docker-build.yml` ("Docker Build Verification") | **`workflow_dispatch` เท่านั้น** เช่นกัน | 3 jobs: build backend Docker image, build frontend Docker image, validate `docker compose config` |

**สำคัญ**: ทั้งสอง workflow ตั้งเป็น `workflow_dispatch`-only — คือต้องกดรันเองจากแท็บ Actions บน GitHub เท่านั้น **ไม่มี** `on: push` หรือ `on: pull_request` ใน repo นี้ ณ ตอนนี้ (มี comment ใน `docker-build.yml` บอกไว้ว่า `# Enable manually while focusing on automation tests only`) ดังนั้นถ้ามีคน push โค้ดพังเข้า `main` ตอนนี้ **จะไม่มีอะไรมาบล็อกหรือแจ้งเตือนอัตโนมัติ**

`ci.yml`'s `backend-tests` job รายละเอียด:
- Python 3.10, `pip install -r requirements.txt` + `pytest pytest-asyncio pytest-cov` แยกต่างหาก
- รัน `pytest --tb=short -v` จาก `backend/` — **ไม่มี real Postgres, ไม่มี model files, ไม่มี GEE credentials** ในขั้นตอนนี้เลย (ดูหัวข้อ 2 ว่าทำไมถึงรันได้)

`ci.yml`'s `frontend-build` job: Node 20, `npm ci` → `npm run lint` → `npm run build`

`docker-build.yml` มี 3 jobs แยก (`build-backend`, `build-frontend`, `docker-compose-check`) — job สุดท้ายรัน `docker compose config` เพื่อ validate syntax ของ `docker-compose.yml` เฉยๆ **ไม่ได้รัน `docker compose up` จริง** จึงไม่เจอบั๊ก `JWT_SECRET_KEY` ที่จะพูดถึงข้างล่าง (แค่ validate syntax ผ่านไม่ได้แปลว่า stack รันได้จริง)

### Manual (ยังไม่ automated)

- **ไม่มี automatic trigger บน push/PR เลย** — ทั้งสอง workflow เป็น manual dispatch ทั้งคู่ (ดูข้างบน) นี่คือช่องว่างที่ใหญ่ที่สุด
- **ไม่มี deployment pipeline** — ไม่มี `deploy.yml` หรือ workflow ใดๆ ที่ push image ไป registry หรือ deploy ขึ้น server จริง ทุกอย่างต้องรันมือ
- **ไม่มี staging/production environment ที่ตั้งไว้แล้ว** — ทีมยังไม่เคย deploy จริงขึ้น server ตามที่บันทึกไว้ใน `docs/production_migration_log.md` ("ยังไม่ได้แก้ในรอบนี้เพราะทีมยังไม่ได้ deploy จริง")
- **ไม่มี schema-parity check ระหว่าง `models.py` กับ live database** — `docs/production_migration_log.md` บันทึกไว้ว่า schema เคย drift ระหว่างโค้ดกับ database จริงมาแล้ว **2 ครั้ง** (คอลัมน์หาย, constraint ค้าง) และแนะนำให้มี periodic/CI-run check เทียบ `models.py` กับ `information_schema` ของ database จริง — ยังไม่มีใครทำ นี่คือ candidate งานที่ดีสำหรับคนทำ CI/CD
- **Playwright E2E tests มีอยู่** (`frontend/src/tests`, รันด้วย `npx playwright test`) **แต่ยังไม่ได้ wire เข้า CI เลย** — ต้องรันมือเท่านั้น ไม่มี job สำหรับมันใน `ci.yml`

---

## 2. วิธีรัน test suite ในเครื่อง

### 🔴 บั๊กที่เพิ่งเจอ (ไม่เกี่ยวกับ Docker เลย — กระทบ local dev ทุกคน) — แก้แล้ว

`app/auth/utils.py` import `bcrypt` และ `jose` (`python-jose`) ตรงๆ แต่ **ทั้งสอง
ไม่เคยอยู่ใน `requirements.txt` เลย** — เจอตอน verify งาน Docker (build image จาก
`requirements.txt` สดๆ แล้วรัน `import main` ข้างใน container) แล้วเจอ
`ModuleNotFoundError: No module named 'bcrypt'` ทันที **ก่อนจะถึงจุดเช็ค
`JWT_SECRET_KEY`/GEE ด้วยซ้ำ** — คือแอปจะ import ไม่ผ่านเลยถ้าไม่มี 2 package นี้
ไม่ว่าจะตั้ง env var ครบแค่ไหนก็ตาม

**ทำไมไม่มีใครเจอมาก่อน**: เครื่อง dev ของทุกคนมี `bcrypt`/`python-jose` ติดตั้งอยู่
แล้ว (น่าจะจากตอนพัฒนาระบบ auth ครั้งแรก) แต่ไม่เคยถูกใส่เข้า `requirements.txt`
— ใครก็ตามที่สร้าง venv ใหม่ตาม README (`python -m venv venv && pip install -r
requirements.txt`) โดยไม่มี 2 package นี้ติดมาจากที่อื่นก่อน **จะเจอ crash แบบ
เดียวกันนี้ทันทีตอนรัน backend เอง** ไม่เกี่ยวกับ Docker เลยแม้แต่น้อย

**แก้แล้ว**: เพิ่ม `bcrypt==5.0.0` และ `python-jose[cryptography]==3.5.0` เข้า
`requirements.txt` (pin เวอร์ชันตามที่ fresh install จริง resolve มาได้ ตาม pattern
เดียวกับ `scikit-learn`) — ถ้า `pip install -r requirements.txt` ของใครยัง fail
เรื่องนี้อยู่ ให้ลบ venv เก่าทิ้งแล้วสร้างใหม่

### Backend (pytest)

```bash
cd backend
python -m venv venv && venv\Scripts\activate     # Windows; source venv/bin/activate บน Mac/Linux
pip install -r requirements.txt
pytest                                            # รันทั้งหมด (ใช้ค่าจาก pytest.ini)
pytest tests/support_functions/test_fuzzy_engine.py -v      # รันไฟล์เดียว
pytest tests/report_management/test_reports_status.py::TestClass::test_name   # รัน test เดียว
```

**จุดสำคัญที่ทำให้ backend test รันได้โดยไม่ต้องมี Postgres จริง หรือมีโมเดล AI**: `backend/tests/conftest.py` ทำ 3 อย่าง:
1. ตั้ง `DATABASE_URL` แบบ dummy ไว้ก่อน import อะไร (ให้ผ่าน startup check ของ `config.py`)
2. แต่ละ test ได้ SQLite (`aiosqlite`) database แยกของตัวเอง (isolated, ไม่ shared state ข้าม test) — ผ่าน SQLAlchemy compiler hook แปลง Postgres `JSONB` columns ให้เป็น plain `JSON` ตอนสร้าง schema บน SQLite
3. fixture `client` override `get_db` dependency แล้วขับ FastAPI app จริงผ่าน `httpx.AsyncClient` (`ASGITransport`) — คือ test พวกนี้ยิง request เข้า router จริง ไม่ใช่ mock router

**สิ่งที่ test พวกนี้ "ไม่" ทดสอบ** (เพราะ mock/stub ไว้): fixture `stub_report_upload_dependencies` (`conftest.py`) monkeypatch ทับ `save_upload_file` และ `process_report_background` ตอน test การ upload — คือ **AI inference จริง (RT-DETR/GEE/RF) ไม่เคยถูกรันใน test suite เลย** เทสพวกนี้เทสแค่ HTTP layer + DB layer เท่านั้น ถ้าจะเทส AI pipeline จริงต้องรันมือแบบ end-to-end (มี model files + GEE credentials + real DB)

โครงสร้าง test แบ่งเป็นโฟลเดอร์ตาม domain: `gps_gis/`, `report_management/`, `support_functions/`, `system_status/` — ครอบคลุม GPS/GIS extraction, report CRUD/status/stats/delete, fuzzy engine + file utils + GPS extractor, และ health/auth endpoints

**Coverage gaps ที่เห็นชัดจากการอ่านโค้ด** (ไม่ใช่การวัด coverage number จริง เพราะไม่ได้รัน `pytest-cov` — แค่สังเกตจากสิ่งที่ mock ไว้):
- ไม่มี test ที่ผ่าน AI pipeline จริง (`ai_engine.calculate_priority_index`, `feature_mapping.py`'s `build_feature_row`/`predict_priority`) — ทั้งหมด mock ทิ้งตอน test ผ่าน HTTP layer
- ไม่มี test สำหรับ `app/analytics/router.py` (`/api/analytics/grid-priority`, CASP) ในรายการไฟล์ test ที่เจอ
- ไม่มี test สำหรับ Gatekeeper rejection flow (`validate_is_road`) โดยตรง

### Frontend (Vite + ESLint + Playwright)

```bash
cd frontend
npm install
npm run dev        # dev server, proxy /api และ /uploads ไป VITE_DEV_PROXY_TARGET (default http://127.0.0.1:8000)
npm run build
npm run lint
npx playwright test                       # E2E tests — ยังไม่ได้ wire เข้า CI (ดูหัวข้อ 1)
npx playwright test path/to/file.spec.js  # รันไฟล์เดียว
```

Playwright tests อยู่ใน `frontend/src/tests` — ต้องมี backend รันอยู่จริง (dev server หรือ container) เพราะเป็น E2E ไม่ใช่ unit test

---

## 3. Docker: สถานะปัจจุบัน (อัปเดต — บั๊ก startup หลักแก้แล้ว, frontend production build ยัง deferred)

### สถาปัตยกรรม

`docker-compose.yml` มี 4 services: `db` (postgres:15-alpine, port 5433→5432) → `backend` (FastAPI) → `frontend` (Vite dev server, **ไม่ใช่ production build** — `frontend/Dockerfile`'s `CMD` คือ `npm run dev -- --host`) → `nginx` (reverse proxy, port `${NGINX_PORT:-8081}`) แต่ละ service มี healthcheck และ `depends_on: condition: service_healthy` เรียงต่อกันเป็น chain

`backend/Dockerfile`: `python:3.12`, ติดตั้ง `libgl1`/`libglib2.0-0` (จำเป็นสำหรับ `opencv-python-headless`), `pip install -r requirements.txt`, รัน `uvicorn main:app --host 0.0.0.0 --port 8000`

`frontend/Dockerfile`: `node:20-alpine`, `npm install`, รัน dev server — **ยังไม่เปลี่ยนเป็น production build โดยเจตนา (deferred)**, ดูกล่อง "⏸️ Deferred" ด้านล่าง

### ✅ แก้แล้ว — บั๊ก startup ที่เคย block `docker compose up`

**บั๊กเดิม**: `docker-compose.yml`'s `backend.environment` เคยส่งแค่ `DATABASE_URL`/`ALLOWED_ORIGINS` (hardcoded เป็น `"http://localhost,http://localhost:5173"`)/`CLOUD_*` เข้า container — ไม่มี `JWT_SECRET_KEY` เลย ในขณะที่ `backend/app/core/config.py` (บรรทัด 42-44) `raise ValueError` ทันทีตอน import ถ้าไม่มีค่านี้ → backend container **crash ทันทีตอน startup**

**แก้แล้ว** (`docker-compose.yml`'s `backend.environment`):
```yaml
DATABASE_URL: ${DATABASE_URL}
JWT_SECRET_KEY: ${JWT_SECRET_KEY}
ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
CLOUD_ENDPOINT: ${CLOUD_ENDPOINT}
CLOUD_ACCESS_KEY: ${CLOUD_ACCESS_KEY}
CLOUD_SECRET_KEY: ${CLOUD_SECRET_KEY}
BUCKET_NAME: ${BUCKET_NAME}
GEE_SERVICE_ACCOUNT: ${GEE_SERVICE_ACCOUNT}
GEE_KEY_PATH: ${GEE_KEY_PATH}
GEE_PROJECT_ID: ${GEE_PROJECT_ID}
```
สามอย่างที่เปลี่ยน:
1. `JWT_SECRET_KEY: ${JWT_SECRET_KEY}` เพิ่มเข้ามา — แก้บั๊กเดิมตรงๆ
2. `ALLOWED_ORIGINS` เปลี่ยนจาก hardcoded string เป็น `${ALLOWED_ORIGINS}` — บั๊กที่สองที่เพิ่งเจอ (ดูหัวข้อถัดไป)
3. `GEE_SERVICE_ACCOUNT`/`GEE_KEY_PATH`/`GEE_PROJECT_ID` เพิ่มเข้ามาใหม่ทั้งหมด — บั๊กที่สามที่เพิ่งเจอ (ดูหัวข้อ "GEE เป็น hard requirement" ด้านล่าง)

ทั้งสาม key ถูกเพิ่มเข้า root `.env.example` แล้วด้วย พร้อม comment อธิบายว่าทำไมจำเป็น

### ✅ แก้แล้ว — `ALLOWED_ORIGINS` เคย hardcode เป็น localhost (เจอตอนประเมิน deploy จริง ไม่ใช่แค่ local `docker compose up`)

บั๊กนี้ไม่เคยแสดงอาการตอนรันแค่ local เพราะ `localhost` คือ origin ที่ใช้อยู่แล้ว — แต่ deploy ขึ้น host/domain จริง frontend จะยิง request จาก origin จริง (ไม่ใช่ `localhost`) แล้วโดน CORS reject ทันที เพราะค่า `ALLOWED_ORIGINS` ที่ hardcode ไว้ใน `docker-compose.yml` ไม่มีทางรู้จัก domain จริงได้เลย ไม่ว่าจะตั้งอะไรใน `.env`

แก้แล้วโดย parameterize เป็น `${ALLOWED_ORIGINS}` (ดูบล็อกข้างบน) — ตอน deploy จริงต้องตั้งค่านี้ใน `.env` ให้ตรงกับ domain จริงของ frontend

### ✅ แก้แล้ว — GEE credentials เป็น hard startup requirement (ไม่ใช่ optional ตามที่เอกสารนี้เคยบอกผิด)

**แก้ไขข้อมูลที่เคยผิดในเอกสารนี้**: ก่อนหน้านี้หัวข้อ 5 บอกว่า `GEE_SERVICE_ACCOUNT`/`GEE_KEY_PATH`/`GEE_PROJECT_ID` "ไม่มีก็รันได้ แต่ GEE features จะ disable" — **ไม่จริง**. `backend/app/ai/gee_integration.py`'s `init_gee()` เช็คทั้ง 3 ตัวแล้ว `raise ValueError`/`RuntimeError` ถ้าตัวใดหายหรือใช้ไม่ได้ และ `main.py`'s `lifespan` เรียก `init_gee()` แบบไม่มี `try/except` ครอบ — คือ **backend จะ crash ตอน startup ถ้าไม่มี GEE credentials ครบ เหมือนกับ `JWT_SECRET_KEY` เป๊ะ** ไม่ใช่ graceful degrade แบบไฟล์โมเดล AI (`best.pt` ฯลฯ) ที่ `ai_engine.load_model()` แค่ log error แล้วรันต่อ

ก่อนหน้านี้ `docker-compose.yml` ไม่เคยส่ง 3 ตัวนี้เข้า container เลย — คือถึงแก้ `JWT_SECRET_KEY` แล้ว container ก็ยัง crash อยู่ดี แค่ crash ที่จุดถัดไป ตอนนี้แก้แล้วพร้อมกับบั๊ก `JWT_SECRET_KEY` (ดูบล็อก environment ข้างบน)

### ✅ แก้แล้ว — ไม่มี `.dockerignore` มาก่อน (secret-leak risk, ร้ายแรงที่สุดในบรรดาที่เจอรอบนี้)

`backend/Dockerfile`/`frontend/Dockerfile` ทั้งคู่ทำ `COPY . .` โดยไม่มี `.dockerignore` มาคอยกรองมาก่อนเลย ความเสี่ยงจริง (ไม่ใช่แค่ทฤษฎี): ถ้า dev คนไหน build image จาก local checkout ที่มี `backend/.env` (สร้างไว้ตาม README สำหรับ local dev นอก Docker) และ `backend/venv/` (ตาม README's `cd backend && python -m venv venv`) อยู่ในโฟลเดอร์ `backend/` ตอนสั่ง `docker build`/`docker compose up --build` — **`.env` ที่มี `JWT_SECRET_KEY`/`DATABASE_URL` credentials จริงจะถูก copy เข้า image layer ทันที** ถ้า image นั้นถูก push ขึ้น registry ที่ไหนสักที่ ความลับจะติดอยู่ใน layer history ถาวร ดึงกลับคืนได้แม้ลบไฟล์ใน layer หลังๆ แล้วก็ตาม — อันตรายแบบเดียวกับที่เคยเจอตอนสแกน git history หา GEE credential เก่า (`docs/production_migration_log.md`) เพียงแต่คนละช่องทาง

**แก้แล้ว**: เพิ่ม `backend/.dockerignore` และ `frontend/.dockerignore` — กัน `.env`/`.env.*` (ยกเว้น `.env.example`), `venv/`, `__pycache__/`, `*.db`, `uploads/`, `cache/`, `scratch/`, `data/` (โฟลเดอร์เก็บ `thailand-latest.osm.pbf` ~325MB ที่ใช้แค่ตอน build cache offline ไม่เคยถูกอ่านตอน runtime เลย), `tests/`, `node_modules/`, `dist/`, ไฟล์ log/csv/sample-image ที่หลงเหลือจาก dev

**หมายเหตุสำคัญเรื่อง scope**: ไม่มี root-level `.dockerignore` โดยเจตนา — `docker-compose.yml`'s `build: ./backend`/`build: ./frontend` ทำให้ build context เป็นแต่ละโฟลเดอร์ย่อย ไม่ใช่ root ของ repo ดังนั้น Docker จะอ่านแค่ `.dockerignore` ที่อยู่ใน root ของ context นั้นๆ เท่านั้น (`backend/.dockerignore`, `frontend/.dockerignore`) — ไฟล์ที่ root repo จะไม่ถูกอ่านเลย ไม่ต้องสร้างไว้ (สร้างไว้เฉยๆ จะหลอกว่ามี coverage ทั้งที่ไม่มีผลจริง)

### ⏸️ Deferred โดยเจตนา — `frontend/Dockerfile` ยังไม่เปลี่ยนเป็น production build

**ทีม frontend ยังพัฒนาไม่เสร็จ** — การบังคับเปลี่ยนเป็น production build (`vite build` + serve แบบ static) ตอนนี้จะกลาย stale/พังทันทีที่มีฟีเจอร์ใหม่เข้ามา จึงตัดสินใจ**เลื่อนงานนี้ออกไปก่อน จนกว่าทีม frontend จะส่งสัญญาณว่าพร้อม** — `frontend/Dockerfile` ยังคงเป็น dev server (`npm run dev -- --host`) เหมือนเดิมทุกประการ ไม่มีการเปลี่ยนแปลงใดๆ ในรอบนี้

**สิ่งที่ยังไม่แก้ (ยังคงอยู่ ตั้งใจปล่อยไว้)**:
- Dev server ไม่เหมาะกับ production traffic จริง (ประสิทธิภาพ/HMR overhead ที่ไม่จำเป็น)
- `vite.config.js` ไม่มี `server.allowedHosts` ตั้งไว้ — Vite (pin ที่ v8) default บล็อก request ที่ `Host` header ไม่ใช่ `localhost`/IP/allowed host ที่ตั้งไว้ (DNS-rebinding protection) เมื่อ deploy จริง `nginx/nginx.conf`'s reverse proxy จะ forward `Host` header จริงของ domain เข้าไป (`proxy_set_header Host $host;`) ซึ่ง**มีโอกาสสูงที่จะโดน Vite ปฏิเสธด้วย 403** — ยังไม่ได้ verify จริงเพราะยังไม่ได้ deploy แต่เป็นพฤติกรรม documented ของ Vite เอง

**เมื่อทีม frontend พร้อมและจะหยิบงานนี้ต่อ**: แผนที่เตรียมไว้แล้ว (ยังไม่ implement) คือ multi-stage build — stage แรก `node:20-alpine` รัน `npm run build` ได้ static bundle ใน `dist/`, stage สองใช้ `nginx:alpine` serve `dist/` บน port 5173 เดิม (ไม่ต้องแก้ `docker-compose.yml`'s port/healthcheck) พร้อม config เล็กๆ ที่มี `try_files $uri $uri/ /index.html;` สำหรับ React Router — แก้ปัญหา `allowedHosts` ไปในตัวเพราะ static nginx ไม่มี host-check แบบ dev server เลย **อย่าทำงานนี้ซ้ำโดยไม่เช็คกับทีม frontend ก่อนว่าพร้อมหรือยัง**

### รันแบบเต็ม stack

```bash
docker compose up --build   # db (postgres:5433) -> backend -> frontend (ยังเป็น dev server) -> nginx (proxy ที่ $NGINX_PORT, default 8081)
```
ต้องมี root `.env` (copy จาก `.env.example`) — ตอนนี้ต้องมี `JWT_SECRET_KEY`/`ALLOWED_ORIGINS`/`GEE_*` ครบด้วย ไม่ใช่แค่ `POSTGRES_*`/`DATABASE_URL`/`NGINX_PORT`/`CLOUD_*` เหมือนก่อนหน้านี้ (ดูบล็อก environment ด้านบน)

**Verification ที่ทำจริงรอบนี้** (ไม่ใช่แค่เดาว่า diff ถูก): `docker build -f backend/Dockerfile backend` รันจริงกับ Docker daemon ในเครื่อง ผลลัพธ์บันทึกไว้ท้ายเอกสารนี้ยังไม่รวม — ดู `production_migration_log.md`'s entry ล่าสุดสำหรับผลการ build แบบเต็ม เพราะ frontend build ถูก defer ไม่ได้รัน `docker compose up` แบบเต็ม stack รอบนี้

---

## 4. Dependency pinning ที่ควรรู้

`backend/requirements.txt`:
- **`scikit-learn==1.8.0`** — pin แบบเจาะจงมาก ไม่ใช่ความบังเอิญ: production Random Forest model (`priority_class_rf_v1.pkl`) ถูก train ด้วย scikit-learn เวอร์ชันนี้เป๊ะๆ ตอนที่เพิ่ม pin เข้าไป (`docs/production_migration_log.md`) เจอว่า PyPI latest ตอนนั้น (1.9.0) เป็นคนละเวอร์ชันกับตัวที่ train โมเดล แปลว่าถ้า `docker compose up --build` รันด้วย requirements ที่ unpinned จะได้ scikit-learn คนละเวอร์ชันจากตอน train model ทันที — **ห้าม bump เวอร์ชันนี้โดยไม่เช็คว่าโมเดล pickle โหลด/predict ได้ถูกต้องเหมือนเดิมก่อน** (pickle ของ sklearn ผูกกับเวอร์ชันที่ save ค่อนข้างแน่น เปลี่ยนเวอร์ชันแล้วโหลดพังเงียบๆ ได้)
- `geopandas==1.1.4` / `shapely==2.1.2` — pinned เช่นกัน (ใช้ใน GIS/GEE integration — `geopandas.datasets` เพิ่งถูกลบออกในเวอร์ชันนี้ ถ้ามีโค้ดใหม่ที่พึ่ง bundled dataset ของ geopandas จะพังทันที)
- `torch`/`torchvision`/`ultralytics`/`opencv-python-headless` — **ไม่ pin เวอร์ชัน** ใช้ AI model จริง (RT-DETR ผ่าน `ultralytics`) ถ้า CI/build environment เปลี่ยนเวอร์ชันเหล่านี้โดยไม่รู้ตัวอาจกระทบผลการ inference ได้ (ยังไม่มี pin, ยังไม่มีปัญหาที่บันทึกไว้ แต่เป็นความเสี่ยงแบบเดียวกับที่ scikit-learn เจอมาแล้ว — ควรพิจารณา pin เพิ่มถ้าจะทำ deploy จริง)

`frontend/package.json`: ใช้ `^` range ปกติ (React 19, Vite 8, antd 6) ไม่มี pin แบบเจาะจงพิเศษ

---

## 5. สิ่งที่ต้องเตรียมสำหรับ production deploy ครั้งแรก (จาก scratch)

โค้ดฝั่ง backend ไม่ crash ถ้าไฟล์พวกนี้ไม่มี (ยกเว้น `JWT_SECRET_KEY` — apps จะไม่ start เลย) แต่ endpoint ที่พึ่งไฟล์เหล่านี้จะ "degrade" แทน (`ai_engine.load_model()` log error แต่ server ยัง start ได้) — production deploy ต้องมีให้ครบก่อนถึงจะทำงานได้จริง:

### Secrets / credentials (ต้อง generate เองหรือขอจากทีม ห้าม commit ขึ้น git)
- `backend/.env` — copy จาก `backend/.env.example`, สร้าง `JWT_SECRET_KEY` ใหม่เอง (`python -c "import secrets; print(secrets.token_hex(32))"`), ตั้งค่า `DATABASE_URL` ให้ชี้ไปที่ database ชื่อ **`road_reports_batch_db`** (สำคัญมาก — ห้ามสร้างชื่อ `road_reports_db` เพราะเป็นชื่อฐานข้อมูลเก่าที่เลิกใช้แล้ว ดูหัวข้อ 6)
- `backend/app/services/Road-maintain.json` — Google Earth Engine service account credentials (ไฟล์จริง ห้าม commit — ขอจากทีม)

### Model files ขนาดใหญ่ (gitignored, ต้องวางมือ)
- `backend/models/best.pt` (~66MB) — RT-DETR damage-detection model
- `backend/best-road-classifier.pt` (~2.8MB, **อยู่ที่ root ของ `backend/` ไม่ใช่ `backend/models/`**) — YOLO Gatekeeper classifier
- `backend/models/priority_class_rf_v1.pkl` (~2.4MB) — production Random Forest priority-class model (ตัวที่ใช้จริง ต้อง pair กับ `scikit-learn==1.8.0` เป๊ะๆ ตามหัวข้อ 4)
- `backend/ppi_rf_model_v3.pkl` (~4.8MB, root ของ `backend/`) — โมเดลเก่า, informational-only ปัจจุบัน (`MLFusionEngine`) ถ้าไม่มีไฟล์นี้แอปจะ auto-train synthetic model แทนตอน startup — ไม่ crash แต่เป็นแค่ side-score ที่ไม่กระทบผลตัดสินใจหลัก

### GIS cache files (gitignored, ต้องวางมือ — ไม่มีก็รันได้แต่ context ว่างเปล่า)
- `backend/cached_driving_network.parquet` (~1.6MB)
- `backend/cached_pois.parquet` (~25KB)
- `backend/cached_admin_boundaries.parquet` (~91MB)

ไฟล์เหล่านี้ build จาก `thailand-latest.osm.pbf` (~325MB) ผ่าน `backend/scripts/build_gis_cache.py` และ `backend/scripts/build_admin_boundary_cache.py` — **README แนะนำไม่ให้ build ใหม่เองถ้าไม่จำเป็น** เพราะกินเวลา/ทรัพยากรมาก ควรขอไฟล์ที่ build ไว้แล้วจากทีมแทน (ไฟล์เล็กพอแชร์ผ่าน Drive/USB ได้)

**Detail แบบเต็มของทุกไฟล์ข้างบน (link ดาวน์โหลด/ตำแหน่งที่ต้องวางเป๊ะๆ) อยู่ใน `README.md`'s section 2-4 — เอกสารนี้สรุปมาเพื่อให้เห็นภาพรวมสำหรับ deploy planning ไม่ได้ replace README** ควรอ่าน README ประกอบตอนตั้งค่าจริง

### Environment variables ทั้งหมด (`backend/.env`)

| Key | จำเป็นหรือไม่ |
|---|---|
| `DATABASE_URL` | **จำเป็น** — แอปจะไม่ start ถ้าไม่มี |
| `JWT_SECRET_KEY` | **จำเป็น** — แอปจะไม่ start ถ้าไม่มี |
| `HOST` / `PORT` / `UPLOAD_DIR` / `MAX_FILE_SIZE_MB` | มีค่า default |
| `ALLOWED_ORIGINS` | มีค่า default (local dev เท่านั้น), CORS whitelist comma-separated — production ต้องตั้งเป็น domain จริงของ frontend |
| `GEE_SERVICE_ACCOUNT` / `GEE_KEY_PATH` / `GEE_PROJECT_ID` | **จำเป็น — แอปจะไม่ start ถ้าขาดตัวใดตัวหนึ่ง** (แก้ไขจากที่เอกสารนี้เคยเขียนผิดไว้ว่า optional — `init_gee()` `raise` ตรงๆ ไม่ใช่ graceful degrade แบบไฟล์โมเดล) |

### Database

- ต้องเป็น database ชื่อ **`road_reports_batch_db`** เป๊ะๆ (ดูหัวข้อ 6 — เหตุผลสำคัญมาก)
- ถ้าเป็น database ใหม่ (ว่างเปล่า): **ไม่ต้องรัน migration เพิ่ม** — `init_db()` สร้างตารางทั้งหมดอัตโนมัติตาม `models.py` ปัจจุบันตอน backend start (รวม normalized satellite tables 7 ตัวของ `AIAnalysis` และคอลัมน์ `rejection_reason`)
- ต้องรัน `python seed_admin.py` เพื่อสร้าง admin account เริ่มต้น (`init_db()` สร้างแค่ตาราง ไม่ใส่ข้อมูล)
- **ไม่มี Alembic หรือ migration tool อื่นในโปรเจกต์นี้** — schema เปลี่ยนแปลงทั้งหมดที่บันทึกไว้ใน `docs/production_migration_log.md` ทำผ่าน manual `ALTER TABLE` scripts เฉพาะกิจ (additive-only, ไม่มี rollback script อัตโนมัติ) ถ้าจะทำ CI/CD ให้เป็นระบบมากขึ้น การเพิ่ม Alembic เป็นตัวเลือกที่ควรพิจารณา — ตอนนี้ยังไม่มี

---

## 6. ประวัติ deployment/infra ที่ควรรู้ก่อนแตะระบบนี้

รายละเอียดเต็มอยู่ใน `docs/production_migration_log.md` — สรุปเฉพาะส่วนที่กระทบงาน deploy/infra:

### เหตุการณ์ database สองตัวพร้อมกัน (สำคัญมาก ต้องรู้ก่อน deploy)

Postgres server เดียวกันเคยมี database 2 ตัวพร้อมกัน:
- `road_reports_batch_db` — **ตัวที่ใช้งานจริง**, 1,382 แถว ณ ตอนตรวจสอบ, active ต่อเนื่อง
- `road_reports_db` — **ตัวเก่าที่เลิกใช้แล้ว**, มีแค่ 12 แถว, stale มาตั้งแต่กลางเดือนกรกฎาคม (ชื่อนี้ตรงกับ template ใน `.env.example` เดิม แต่เป็นฐานข้อมูล abandoned)

**นี่คือเหตุผลที่ `README.md` และเอกสารนี้เน้นย้ำว่า `DATABASE_URL` ต้องชี้ไปที่ `road_reports_batch_db` เป๊ะๆ** — ถ้า deploy ใหม่แล้วสร้าง database ผิดชื่อ หรือ point ไปผิดตัว จะเจอปัญหาแบบเดียวกับที่เคยเกิดมาแล้ว

### Schema drift เคยเกิดมาแล้ว 2 ครั้ง (คนละสาเหตุ)

1. **Missing columns**: live database ขาดคอลัมน์ที่ `models.py` ประกาศไว้ถึง 11 คอลัมน์ (4 ตัวเก่า + 7 ตัวใหม่จากงาน RF migration) — ทำให้ **ทุก read/write ผ่าน reports API พังหมด** เพราะ SQLAlchemy ORM select/insert ทุกคอลัมน์ที่ map ไว้โดย default แก้ด้วย additive `ALTER TABLE` มือ
2. **Stale NOT NULL constraint**: `models.py` claim ว่า column ถูก loosen เป็น nullable แล้ว (ผ่าน comment ในโค้ด) แต่ live database ไม่เคยถูก apply จริง ทำให้ INSERT พังตอน deploy การ normalize `AIAnalysis` เป็น satellite tables

**Team recommendation ที่บันทึกไว้**: ควรมี periodic (เช่น CI-run) schema-parity check เทียบ `models.py`'s declared columns/nullability กับ live `information_schema` — จะจับปัญหาแบบนี้ได้ก่อนขึ้น production **ยังไม่มีใครสร้าง check นี้จริง — เป็นงานที่เปิดอยู่ ถ้าคนทำ CI/CD อยากหยิบงานนี้ทำต่อ**

### PPI score เคย miscalibrated รุนแรง (ผลกระทบต่อ production data ไม่ใช่แค่โค้ด)

โมเดลเก่า (synthetic-trained `MLFusionEngine`) เคย flag รายงานถึง 88.5% ว่าเป็น "Critical-range" ทั้งที่โมเดลใหม่ (validated RF) วัดได้แค่ 43.7% — คือ dashboard/heatmap เคยแสดงข้อมูลที่ inflate มาก่อน มีการ backfill ข้อมูลเก่า 1,381/1,382 แถวแล้วเพื่อแก้ (ดู log เต็มสำหรับรายละเอียด) **ถ้าเจอข้อมูล priority ที่ดูแปลกๆ ใน environment เก่าที่ไม่ได้ backfill (เช่น restore จาก backup เก่า) ให้สงสัยประเด็นนี้ไว้ก่อน**

### GEE credential exposure ในประวัติ git (known, accepted risk — ไม่ใช่ต้องแก้ด่วน)

มี 3 commit เก่าใน git history ที่มี GEE service-account email + GCP project ID จริงติดอยู่ (genericize เป็น placeholder แล้วใน commit ถัดมา) **ไม่มี private key ติดไปด้วย** — ทีมตัดสินใจไม่ rotate service account เพราะ risk ต่ำ (แค่ email/project ID ไม่ใช่ credential ตัวจริง) เทียบกับ cost ในการ coordinate rotate ทั้งทีม ถ้าจะทำ security hardening เพิ่มก่อน public release สามารถหยิบเรื่องนี้กลับมาทำได้ — ไม่ใช่ blocker ตอนนี้

---

## 7. คำแนะนำสำหรับ CI/CD setup ต่อจากนี้ (gap-based, ไม่ใช่ prescriptive)

จากช่องว่างที่เจอในหัวข้อ 1 เรียงตาม impact:

1. **เปิด automatic trigger** — เปลี่ยน `ci.yml` จาก `workflow_dispatch`-only ให้มี `on: push`/`on: pull_request` อย่างน้อยสำหรับ `main` branch หรือ PR เข้า `main` (ตอนนี้ไม่มีอะไรกันโค้ดพังเข้า `main` เลยถ้าไม่มีคนกดรัน manual)
2. ~~แก้บั๊ก `JWT_SECRET_KEY` ใน `docker-compose.yml` ก่อน~~ **แก้แล้ว** (หัวข้อ 3 — พร้อม `ALLOWED_ORIGINS`/`GEE_*` ที่เจอเพิ่มระหว่างแก้) — แต่ `docker-build.yml`'s `docker-compose-check` job (ที่แค่ validate syntax) ยังจับบั๊กแบบนี้ไม่ได้อยู่ดีถ้ามันเกิดซ้ำในอนาคต ถ้าจะให้ CI จับบั๊กประเภทนี้ได้จริง ต้องเปลี่ยนจาก `docker compose config` เป็นการรัน `docker compose up` จริงแล้วเช็ค healthcheck ผ่าน — ยังเป็น recommendation ที่เปิดอยู่
3. **Wire Playwright E2E เข้า CI** — ตอนนี้มี test อยู่แล้วแต่ไม่ได้รัน ต้องมี backend service พร้อม dependencies ปลอมหรือจริงให้ CI runner ก่อน (models/GEE อาจ mock/skip สำหรับ E2E level)
4. **พิจารณาเพิ่ม schema-parity check** เป็น CI job (หัวข้อ 6 — ทีมแนะนำไว้เองใน migration log แล้ว)
5. **พิจารณา pin `torch`/`torchvision`/`ultralytics`** เพิ่มเติม — ตอนนี้ unpinned ขณะที่ `scikit-learn` โดน pin เพราะเจอปัญหาจริงมาแล้วครั้งหนึ่ง ความเสี่ยงแบบเดียวกันมีกับ AI libs ตัวอื่นที่ยัง unpinned
6. **ยังไม่มี deployment pipeline เลย** — ถ้าจะ deploy production จริง ต้องเริ่มจาก 0: เลือก target (VM/container registry/PaaS), เขียน `deploy.yml`, จัดการ secrets ผ่าน GitHub Secrets หรือเทียบเท่า, และแก้ `frontend/Dockerfile` ให้ build production bundle แทนการรัน `npm run dev` (**deferred โดยเจตนา ณ ตอนนี้ เพราะทีม frontend ยังพัฒนาไม่เสร็จ — ดูหัวข้อ 3's "⏸️ Deferred" box สำหรับแผนที่เตรียมไว้แล้ว อย่าเริ่มงานนี้โดยไม่เช็คกับทีม frontend ก่อนว่าพร้อมหรือยัง**)

---

*เขียนจากการอ่านโค้ดจริงใน repo ณ ตอนที่เขียน (`.github/workflows/`, `backend/tests/`, `docker-compose.yml`, `Dockerfile`s, `requirements.txt`, `package.json`, `README.md`, `docs/production_migration_log.md`) — ถ้าโค้ดเปลี่ยนหลังจากนี้ ให้เช็คของจริงในโค้ดแทนที่จะเชื่อเอกสารนี้ 100%*
