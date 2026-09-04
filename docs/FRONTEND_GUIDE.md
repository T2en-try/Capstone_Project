# Frontend Guide — AI Pipeline & API Contract

เอกสารนี้เขียนไว้สำหรับทีม frontend ที่จะสร้างฟีเจอร์บนข้อมูลที่ backend ส่งมา อธิบายว่า pipeline ทำอะไรในระดับ concept (ไม่ลงลึกเรื่อง ML) และ field ไหนใช้ทำอะไรได้บ้างจริงๆ จาก field name/path จริงในโค้ด ณ ตอนที่เขียน — ถ้ามีอะไรที่ยังไม่ implement จะบอกตรงๆ

---

## 1. ภาพรวม pipeline แบบ conceptual (ไม่ต้องรู้ ML ก็เข้าใจได้)

เมื่อผู้ใช้อัปโหลดรูปถนนที่ `POST /api/reports/upload`:

```
1. อัปโหลดรูป + (พิกัด GPS ถ้ามี)
        ↓
2. ตอบกลับทันที (201) — บันทึกแล้วสถานะ "processing", ยังไม่มีผล AI
        ↓  (ทำงานเบื้องหลัง ไม่บล็อก response)
3. Gatekeeper — เช็คว่าเป็น "รูปถนน" จริงไหม (YOLO classifier)
   ├─ ไม่ใช่รูปถนน → สถานะ "rejected", จบ ไม่ทำขั้นต่อไป
   └─ ใช่ → ไปขั้นต่อไป
        ↓
4. ตรวจจับความเสียหาย (RT-DETR) — หารอยแตก/หลุม จำแนกประเภท/ความรุนแรง
        ↓
5. ดึงข้อมูลบริบทรอบพิกัด (Google Earth Engine + OpenStreetMap)
   — ฝนตกสะสม, ความชื้นดิน, ประเภทถนน, จำนวนเลน, ระยะห่างจากชุมชน ฯลฯ
        ↓
6. รวมทุกอย่าง (ความเสียหาย + บริบทแวดล้อม + ประวัติแจ้งซ้ำจากผู้ใช้คนอื่น)
   เข้าโมเดล Random Forest ตัวเดียว → ได้ priority_class (Normal/Warning/Critical)
   พร้อมค่าความมั่นใจ
        ↓
7. บันทึกผล, เปลี่ยนสถานะเป็น "completed"
```

**สิ่งที่ frontend ต้องเข้าใจจาก flow นี้**: response ของ `POST /upload` **ไม่เคยมีผล AI ติดมาด้วย** (`ai_result` เป็น `null` เสมอในตอนนั้น — อ่านจาก `backend/app/reports/router.py`'s `upload_report` โดยตรง ไม่ใช่สมมติฐาน) เพราะ AI รันเป็น background job หลังจากตอบ response ไปแล้ว **ถ้า UI จะโชว์ผล AI ต้อง poll หรือ fetch ใหม่ทีหลัง** (เช่น `GET /api/reports/{id}`) ไม่ใช่รอจาก response ของการอัปโหลดตรงๆ

(หมายเหตุ: มี component ชื่อ `AiResultModal.jsx` ที่ดักโชว์ `res.data.ai_result` จาก response การอัปโหลดใน `UserReportPage.jsx` — แต่เนื่องจาก `ai_result` เป็น `null` เสมอตามที่อธิบายข้างบน modal นี้จึง**ไม่เคยถูก trigger ในการทำงานจริงตอนนี้** เป็น dead code ที่ทีมทราบอยู่แล้วและตั้งใจปล่อยไว้ — ดู `docs/production_migration_log.md`)

---

## 2. Output หลัก: `priority_class` / `confidence_score` / `proba_*`

ผลลัพธ์สุดท้ายของ pipeline ต่อรายงานหนึ่งใบคือการจำแนกเป็น 3 ระดับ ไม่ใช่คะแนนต่อเนื่องแบบเก่าอีกต่อไป — mapping ตรงๆ จาก `backend/app/ai/feature_mapping.py`:

```python
FINAL_DECISION_LABELS = {
    1: "Good (สภาพปกติ)",       # priority_class = 1 → Normal
    2: "Warning (ควรเฝ้าระวัง)", # priority_class = 2 → Warning
    3: "Critical (ต้องซ่อมแซมด่วน)", # priority_class = 3 → Critical
}
```

Field ที่ frontend เห็นได้ (จาก `AIAnalysisResponse` ใน `backend/app/reports/schemas.py`):

| Field | ประเภท | ความหมาย |
|---|---|---|
| `priority_class` | `int \| null` (1/2/3) | ระดับที่โมเดลเลือก — ใช้เทียบกับ `FINAL_DECISION_LABELS` ข้างบนถ้าจะโชว์ label เอง |
| `confidence_score` | `float \| null` (0.0–1.0) | ความมั่นใจของโมเดลต่อ class ที่เลือก (คือ probability ของ class ที่ predict) |
| `proba_normal` / `proba_warning` / `proba_critical` | `float \| null` | ความน่าจะเป็นเต็มของทั้ง 3 class (รวมกัน = 1.0) ใช้ทำ breakdown chart ได้ |
| `final_decision` | `string` | label ข้อความสำเร็จรูป (`"Good (สภาพปกติ)"` ฯลฯ) — ตรงกับ `priority_class` เสมอ (มี incident เก่าที่สองค่านี้เคย drift กัน ตอนนี้ sync กันแล้ว) |
| `final_fusion_score` | `float` | คะแนนต่อเนื่อง 0-100 (deprecated แต่ยังคำนวณอยู่เพื่อ backward-compat) — ถ้าจะสร้าง UI ใหม่ **แนะนำใช้ `priority_class`/`proba_*` แทน ไม่ใช่ตัวนี้** |

**`priority_class`/`confidence_score`/`proba_*` เป็น `null` ได้** — กรณีที่ไม่มีพิกัด GPS เลย (partial_success path ที่รันแค่ CV โดยไม่มีบริบทพิกัด) จะไม่มีการ predict priority class เลย ต้อง handle `null` ใน UI ไม่ใช่ assume ว่ามีเสมอ

**ตัวอย่างการโชว์ผล ที่ frontend ทำได้จริงจาก field พวกนี้**:
- **Confidence badge**: `confidence_score` × 100 → "มั่นใจ 87.3%" (`ReportDetailModal.jsx`'s ฝั่ง `features/reports/` ทำแบบนี้อยู่แล้วในบล็อก "สรุปผลการประเมิน" — ใช้เป็น reference ได้)
- **Probability breakdown chart** (ยังไม่มีใครสร้าง — ใช้ `proba_normal`/`proba_warning`/`proba_critical` ทำ horizontal stacked bar หรือ 3-segment donut ได้ตรงๆ เพราะรวมกัน = 1.0 เสมอ)
- **Map pin สี**: ระบายสีตาม `priority_class` (1=เขียว/2=เหลือง/3=แดง เป็นต้น) — ดูหัวข้อ 5 เรื่อง endpoint สำหรับ map

---

## 3. GPS anomaly flag-and-defer flow

บาง report จะถูก flag ว่า **พิกัด GPS อาจไม่ตรงกับสิ่งที่อยู่ในรูป** (ตรวจจากข้อมูลพืชพรรณ/NDVI เทียบกับสิ่งที่ควรเห็นในรูปถนน) — ไม่ใช่ error, เป็นแค่สัญญาณเตือนให้ผู้ใช้ยืนยัน/แก้พิกัดเอง

Field ที่เกี่ยวข้อง (อยู่ใน `AIAnalysisResponse`):
- `gps_anomaly_flagged: bool | null` — `true` เมื่อระบบสงสัยพิกัดผิด
- `gps_anomaly_reason: string | null` — เหตุผล (ยังไม่มีการ enumerate ค่าที่เป็นไปได้ทั้งหมดในเอกสารนี้ — ต้องเช็คค่าจริงจาก response หรือถามทีม backend ถ้าจะ localize ข้อความเอง)

**UI state ที่มีอยู่แล้วให้ดูเป็นตัวอย่าง** (`frontend/src/features/reports/ReportDetailModal.jsx`):
```jsx
const gpsAnomalyFlagged = report.ai_analysis?.gps_anomaly_flagged === true;
// ...
{gpsAnomalyFlagged && (
  <div>... banner สีเหลือง เตือนผู้ใช้ + ปุ่ม "ยืนยัน/แก้ไขตำแหน่ง" ...</div>
)}
```
เมื่อกดปุ่ม จะเปิด `GpsPinModal.jsx` (แผนที่ full-screen ให้ผู้ใช้เลื่อนปักหมุดตำแหน่งใหม่) แล้วยิงพิกัดใหม่ไปที่ `PATCH /api/reports/{id}/location` — endpoint นี้อัปเดตพิกัด, ตั้งสถานะกลับเป็น "processing" ชั่วคราว, และรัน AI วิเคราะห์ใหม่แบบ background ด้วยพิกัดใหม่ (ดูหัวข้อ 5)

**ถ้าจะสร้างหน้าใหม่ที่ต้อง handle anomaly flag** — pattern นี้ (`GpsPinModal` + `PATCH .../location`) คือของที่มีอยู่แล้ว ใช้ซ้ำได้เลย ไม่ต้องสร้างใหม่จากศูนย์

---

## 4. Gatekeeper rejection flow

รูปที่อัปโหลดมาแล้ว AI ตัดสินว่า "ไม่ใช่รูปถนน" จะไม่ผ่านขั้นตอนวิเคราะห์เลย (ไม่มี GEE/OSM/RF ใดๆ รันเลย เพื่อประหยัด resource) — สถานะจะกลายเป็น `"rejected"` ทันที

Field ที่เกี่ยวข้อง (อยู่ที่ `ReportResponse` ระดับบนสุด ไม่ใช่ใน `ai_analysis` เพราะ Gatekeeper reject เกิดขึ้น**ก่อน**มี `AIAnalysis` row ด้วยซ้ำ):
- `status: "pending" | "processing" | "completed" | "rejected"`
- `rejection_reason: string | null` — ค่าที่เป็นไปได้จริงตอนนี้ (จากการอ่าน `backend/app/reports/router.py` โดยตรง, ทุกจุดที่ set ค่านี้):
  | ค่า | เกิดตอนไหน |
  |---|---|
  | `"not_a_road"` | Gatekeeper ปฏิเสธ (รูปไม่ใช่ถนน) |
  | `"analysis_failed"` | AI engine error ระหว่างวิเคราะห์ หรือ background task ล้มเหลวแบบไม่คาดคิด |
  | `null` | Admin เปลี่ยนสถานะเป็น rejected เองผ่าน `PATCH /{id}/status` (ไม่บันทึกเหตุผล เพราะ `ReportUpdateStatus` schema ไม่มี field เก็บเหตุผล) |

**Label ภาษาไทยที่มีอยู่แล้วให้ใช้ซ้ำได้** (`frontend/src/features/reports/ReportDetailModal.jsx`):
```js
const REJECTION_REASON_LABELS = {
  not_a_road: 'ภาพที่แจ้งไม่ใช่ภาพถนน (ตรวจพบโดยระบบอัตโนมัติ)',
  analysis_failed: 'ระบบวิเคราะห์ภาพผิดพลาด กรุณาลองแจ้งใหม่อีกครั้ง',
};
```
โชว์เป็น banner สีแดงเมื่อ `report.status === 'rejected'` — ใช้ pattern เดียวกับ GPS-anomaly banner ในไฟล์เดียวกัน (บล็อกสไตล์เดียวกัน แค่สี/ข้อความต่างกัน) `rejection_reason` เป็น `null` ได้ (เคส admin reject เอง) ต้อง fallback message ไว้ด้วย (ไฟล์ตัวอย่างมี fallback อยู่แล้ว: `'รายงานนี้ไม่ผ่านการตรวจสอบ (ไม่ระบุเหตุผล)'`)

**ถ้า admin ย้ายสถานะออกจาก `rejected`** ไปสถานะอื่น backend จะ clear `rejection_reason` เป็น `null` อัตโนมัติ (กัน reason เก่าค้าง) — frontend ไม่ต้อง handle stale reason เอง

---

## 5. Endpoint ที่มีอยู่จริงตอนนี้ (จาก `backend/app/reports/router.py`, `app/auth/router.py`, `app/analytics/router.py`)

### Reports (`/api/reports`, ไม่มี auth ยกเว้นที่ระบุ)

| Method + Path | ทำอะไร | Auth |
|---|---|---|
| `POST /api/reports/upload` | อัปโหลดรูป (multipart: `image`, optional `latitude`/`longitude`/`description`/`reporter_name`) — คืน `201` ทันที, AI รันเบื้องหลัง | ไม่ต้อง |
| `GET /api/reports/` | รายการ report แบบ pagination (`page`, `per_page`, optional `status` filter) | ไม่ต้อง |
| `GET /api/reports/stats/summary` | นับจำนวนต่อสถานะ (`total_reports`, `pending_count`, `processing_count`, `completed_count`, `rejected_count`) | ไม่ต้อง |
| `GET /api/reports/map/points` | จุดพิกัดทั้งหมดสำหรับ heatmap/severity map (มี `include_rejected` query param, default `false`) — คืน field พร้อมใช้: `damage_level` (`critical`/`warning`/`moderate`/`good`/`unknown`), `severity_score`, `fusion_score`, `decision`, `road_name` | ไม่ต้อง |
| `GET /api/reports/{id}` | รายละเอียด report เดี่ยว พร้อม `ai_analysis` เต็ม | ไม่ต้อง |
| `PATCH /api/reports/{id}/location` | ยืนยัน/แก้พิกัด (ใช้กับ GPS-anomaly flow ในหัวข้อ 3) — รัน AI วิเคราะห์ใหม่เบื้องหลัง | ไม่ต้อง (ตั้งใจให้ public แก้ได้ ตามโมเดล public-access ของระบบนี้) |
| `PATCH /api/reports/{id}/status` | เปลี่ยนสถานะ (admin action) | **ต้อง JWT** (`get_current_admin`) |
| `DELETE /api/reports/{id}` | ลบ report | **ต้อง JWT** |

**หมายเหตุเรื่อง auth**: endpoint เกือบทั้งหมดของ `reports` **ไม่ต้อง authenticate** รวมถึง `PATCH .../location` — เป็นการตัดสินใจตั้งใจของทีม (โมเดล public-access เดิม ใครก็แก้พิกัด report ที่มองเห็นในรายการสาธารณะได้) ไม่ใช่ช่องโหว่ที่พลาดลืม แต่ถ้า frontend จะสร้างหน้า user-facing อย่าลืมว่าไม่มี ownership check ใดๆ — ผู้ใช้คนไหนก็ต่อ `PATCH`/เห็นข้อมูล report ของคนอื่นได้หมด ถ้าฟีเจอร์ใหม่ต้องการจำกัดสิทธิ์ ต้องคุยกับ backend เพิ่ม ยังไม่มี mechanism นี้

### Auth (`/api/auth`, สำหรับ admin เท่านั้น)

| Method + Path | ทำอะไร |
|---|---|
| `POST /api/auth/login` | login ด้วย email/password → คืน JWT `access_token` + ข้อมูล admin |
| `GET /api/auth/me` | ตรวจ token ปัจจุบัน → คืนข้อมูล admin (ใช้เช็คว่า token ยัง valid อยู่ไหม) |

ใช้ผ่าน `frontend/src/services/authService.js` (ยังไม่ได้อ่านไฟล์นี้ในรายละเอียดในเอกสารนี้ — เช็คโค้ดจริงถ้าต้องการ implementation)

### Analytics (`/api/analytics`)

| Method + Path | ทำอะไร |
|---|---|
| `GET /api/analytics/grid-priority` | CASP: จัด report ที่ completed แล้วเข้า grid 100×100m คำนวณ priority รวม (`?days=` กรองช่วงเวลาย้อนหลัง, default 7) |

Endpoint นี้ขับ component `GridLayer.jsx`/`GridPriorityTable.jsx`/`TopPriorityAreas.jsx` ที่มีอยู่แล้วในฝั่ง admin

---

## 6. โครงสร้าง component ที่มีอยู่แล้ว (รู้ก่อนสร้างซ้ำ)

Route tree หลัก (`src/App.jsx`) แยกเป็น 2 กลุ่มไม่เกี่ยวกัน:
- **Public/user**: `/` (`UserDashboard`), `/report` (`UserReportPage` — หน้าอัปโหลด/ดูรายการของผู้ใช้ทั่วไป)
- **Admin**: `/login` (`AdminLoginPage`) และ `/admin/*` ภายใต้ `AdminLayout` (มี `ProtectedRoute` เช็ค JWT ก่อนเข้า) — มี `dashboard`, `priority-reports`, `reports/:id`, `map`, `ai` (data validation)

**⚠️ มี component ชื่อซ้ำกันคนละที่ ต้องระวังตอนแก้ไข**:
- `frontend/src/components/user-dashboard/ReportDetailModal.jsx` (ใช้กับ `UserDashboard`)
- `frontend/src/features/reports/ReportDetailModal.jsx` (ใช้กับ `UserReportPage` — ตัวที่มี GPS-anomaly banner + rejection banner ตามหัวข้อ 3/4 ข้างบน)

สองไฟล์นี้**คนละไฟล์ คนละ import path** ถ้าจะเพิ่ม field ใหม่ (เช่น probability breakdown chart) ต้องเช็คว่าหน้าไหนใช้ตัวไหน แล้วแก้ให้ตรงตัว — แก้ผิดไฟล์จะไม่มี error ให้เห็น แค่ฟีเจอร์ไม่โผล่ในหน้าที่ตั้งใจ

Component โฟลเดอร์อื่นที่มีอยู่แล้ว ตรงกับหน้า admin ที่ชื่อเดียวกัน: `components/admin-dashboard/`, `components/admin-GISmap/`, `components/admin-priority/admin-prioritydetail/`, `components/admin-datavalidation/`

**`src/mock/*` ยังมีอยู่และบาง component ยังอ่านจาก mock ไม่ใช่ backend จริง** — ก่อนแก้ component ไหน เช็คก่อนว่ามัน import จาก `services/api.js`/`axios` (ของจริง) หรือจาก `../mock/xxx.js` (mock data, ยังไม่ wire เข้า backend) อย่าสมมติว่า component ที่มีอยู่แล้วต่อ backend จริงเสมอ

`services/api.js` มีแค่ base URL constants (`BASE_URL`, `API_REPORTS`) — build จาก `VITE_API_BASE_URL` (default: same-origin ผ่าน Vite dev proxy ไป `/api`) ไม่มี wrapper function สำเร็จรูป ส่วนใหญ่เรียก `axios` ตรงๆ ในแต่ละหน้า (ดู `UserReportPage.jsx` เป็นตัวอย่าง pattern)

---

## 7. สรุป: เมนูสิ่งที่ทำได้จริงตอนนี้โดยไม่ต้องแก้ backend

จาก field/endpoint ที่มีจริงข้างบน นี่คือฟีเจอร์ frontend ที่ทำได้เลยโดยไม่ต้องรอ backend เพิ่ม field ใหม่:

- **Map pin ระบายสีตาม priority** — `GET /api/reports/map/points` มี `damage_level` สำเร็จรูปให้แล้ว (`critical`/`warning`/`moderate`/`good`/`unknown`) หรือจะดึง `priority_class` จาก `GET /api/reports/{id}` มาระบายเองก็ได้
- **Confidence badge บนการ์ด/รายละเอียด report** — `confidence_score` × 100, มีตัวอย่างการโชว์อยู่แล้วใน `features/reports/ReportDetailModal.jsx`
- **Probability breakdown chart** (ยังไม่มีที่ไหนสร้าง) — `proba_normal`/`proba_warning`/`proba_critical` พร้อมใช้ รวมกัน = 1.0 เสมอ
- **Rejection banner** — `status === 'rejected'` + `rejection_reason` มี label ภาษาไทยสำเร็จรูปให้ใช้ซ้ำแล้ว (หัวข้อ 4)
- **GPS-anomaly confirm flow** — `gps_anomaly_flagged`/`gps_anomaly_reason` + `GpsPinModal.jsx` ที่มีอยู่แล้ว (หัวข้อ 3) เอาไปต่อกับหน้าอื่นได้เลยถ้าต้องการ pattern เดียวกัน
- **Admin status-change actions** — `PATCH /{id}/status` (ต้อง JWT) มี status 4 ค่าให้เลือก (`pending`/`processing`/`completed`/`rejected`) ตัวอย่าง UI อยู่ใน `ReportDetailModal.jsx`'s ปุ่มด้านล่าง
- **CASP grid priority dashboard เพิ่มเติม** — `GET /api/analytics/grid-priority?days=N` ปรับ `days` ให้ผู้ใช้เลือกช่วงเวลาเองได้ (ตอนนี้ hardcode default 7 ใน backend, frontend ส่ง query param เองได้)
- **สถิติภาพรวม** — `GET /api/reports/stats/summary` พร้อมใช้ทำ dashboard tile ใหม่ๆ ได้ทันที

**สิ่งที่ frontend "ทำไม่ได้" ด้วย API ปัจจุบัน โดยไม่แก้ backend ก่อน**: จำกัดสิทธิ์ผู้ใช้ทั่วไปให้แก้ไข/ลบได้แค่ report ของตัวเอง (ไม่มี user identity ผูกกับ report เลย ดูหัวข้อ 5), ดึงรายละเอียดว่า `gps_anomaly_reason` มีค่าที่เป็นไปได้ทั้งหมดกี่แบบ (ต้องถาม backend หรือไล่โค้ด `gee_integration.py` เอง ไม่ได้ enumerate ไว้ในเอกสารนี้)

---

*เขียนจากการอ่านโค้ดจริงใน repo ณ ตอนที่เขียน (`backend/app/reports/schemas.py`, `backend/app/reports/router.py`, `backend/app/ai/feature_mapping.py`, `backend/app/auth/router.py`, `backend/app/analytics/router.py`, `frontend/src/` component tree, `docs/production_migration_log.md`) — ถ้าโค้ดเปลี่ยนหลังจากนี้ ให้เช็คของจริงในโค้ดแทนที่จะเชื่อเอกสารนี้ 100%*
