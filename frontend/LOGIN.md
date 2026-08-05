# 🔐 Admin Login Feature — Progress Tracking

## Backend (FastAPI)

### ✅ Step 1: Install Dependencies
- `bcrypt`, `python-jose[cryptography]`, `passlib[bcrypt]` — ติดตั้งสำเร็จ

### ✅ Step 2: Config & Environment
- เพิ่ม `JWT_SECRET_KEY` ใน `.env`
- เพิ่ม `JWT_SECRET_KEY`, `JWT_ALGORITHM` ใน `config.py`

### ✅ Step 3: Auth Module (`backend/app/auth/`)
- `models.py` — `AdminUser` model (id, email, hashed_password, full_name, role, is_active, created_at, last_login)
- `schemas.py` — `LoginRequest`, `LoginResponse`, `AuthMeResponse`, `AdminInfo`
- `utils.py` — `hash_password()`, `verify_password()`, `create_access_token()`, `verify_token()`
- `router.py` — `POST /api/auth/login`, `GET /api/auth/me`

### ✅ Step 4: Register Auth Router
- เพิ่ม `app.include_router(auth_router)` ใน `main.py`

### ✅ Step 5: Seed Admin Script
- `seed_admin.py` — สร้าง admin user เริ่มต้น
- รันสำเร็จ — Admin ID: 1

### ✅ Step 6: Run Seed Script
- Admin สร้างสำเร็จแล้วในฐานข้อมูล

---

## Frontend (React + Vite)

### ✅ Step 7: Auth Service (`services/authService.js`)
- `login()`, `getMe()`, `logout()`, `getToken()`, `getAdminInfo()`, `isAuthenticated()`

### ✅ Step 8: Login Page (`pages/AdminLoginPage.jsx`)
- หน้า Login แบบ dark glassmorphism — form email + password
- มีปุ่ม "กลับหน้าหลัก"
- แสดง error message ถ้า login ไม่สำเร็จ

### ✅ Step 9: Protected Route (`components/ProtectedRoute.jsx`)
- ตรวจสอบ JWT token ก่อนเข้า Admin routes
- ถ้าไม่มี token → redirect ไป `/login`
- แสดง loading spinner ระหว่างตรวจสอบ

### ✅ Step 10: Update App.jsx Routes
- เพิ่ม route `/login` → `AdminLoginPage`
- ครอบ Admin Layout ด้วย `ProtectedRoute`

### ✅ Step 11: AdminHeader Logout
- ปุ่ม Logout ใน dropdown ทำงานได้จริง (เรียก `authLogout()` + redirect)
- แสดงชื่อ Admin จาก localStorage

---

## Default Admin Credentials
| Field    | Value                    |
|----------|--------------------------|
| Email    | `admin@roadmonitor.com`  |
| Password | `admin1234`              |

## ไฟล์ที่สร้างใหม่
| ไฟล์ | ที่อยู่ |
|------|---------|
| Auth Models | `backend/app/auth/models.py` |
| Auth Schemas | `backend/app/auth/schemas.py` |
| Auth Utils | `backend/app/auth/utils.py` |
| Auth Router | `backend/app/auth/router.py` |
| Seed Script | `backend/seed_admin.py` |
| Auth Service | `frontend/src/services/authService.js` |
| Login Page | `frontend/src/pages/AdminLoginPage.jsx` |
| Protected Route | `frontend/src/components/ProtectedRoute.jsx` |

## ไฟล์ที่แก้ไข (เพิ่มเข้าไปเท่านั้น ไม่ลบโค้ดเดิม)
| ไฟล์ | สิ่งที่เพิ่ม |
|------|-------------|
| `backend/.env` | เพิ่ม `JWT_SECRET_KEY` |
| `backend/app/core/config.py` | เพิ่ม JWT settings 2 บรรทัด |
| `backend/main.py` | เพิ่ม import + `app.include_router(auth_router)` |
| `frontend/src/App.jsx` | เพิ่ม `/login` route + ครอบ admin ด้วย `ProtectedRoute` |
| `frontend/src/layouts/AdminHeader.jsx` | เพิ่ม logout handler + แสดงชื่อ admin |
