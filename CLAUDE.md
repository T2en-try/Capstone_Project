# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Road Remaining Life Prediction System — a capstone webapp that lets users upload road-damage photos and gives admins a dashboard to review AI-scored repair priority. Three parts: `backend/` (FastAPI + AI inference), `frontend/` (React + Vite), `nginx/` (reverse proxy for the Docker stack).

## Commands

### Backend (`backend/`)
```bash
python -m venv venv && venv\Scripts\activate     # Windows; source venv/bin/activate on Mac/Linux
pip install -r requirements.txt
python scripts/reset_db.py                        # (Re)creates all tables — DROPS existing data
python -m uvicorn main:app --reload                # http://127.0.0.1:8000, docs at /docs
python seed_admin.py                               # Create default admin user (admin@roadmonitor.com / admin1234)
pytest                                             # Run backend tests (settings from pytest.ini)
pytest tests/test_fuzzy_engine.py -v               # Run a single test file
pytest tests/test_fuzzy_engine.py::TestClass::test_name  # Run a single test
```
Backend tests do **not** need a real Postgres instance: `tests/conftest.py` sets a dummy `DATABASE_URL` before import (satisfying `config.py`'s startup check) and each test gets an isolated SQLite (`aiosqlite`) DB with `JSONB` columns compiled to plain `JSON` via a SQLAlchemy compiler hook. The `client` fixture overrides `get_db` and drives the real FastAPI app through `httpx.AsyncClient`.

### Frontend (`frontend/`)
```bash
npm install
npm run dev        # Vite dev server; proxies /api and /uploads to VITE_DEV_PROXY_TARGET (default http://127.0.0.1:8000)
npm run build
npm run lint
npx playwright test                       # E2E tests (tests live in frontend/src/tests, not yet wired to CI)
npx playwright test path/to/file.spec.js  # Single Playwright test file
```

### Docker (full stack)
```bash
docker compose up --build   # db (postgres:5433) -> backend -> frontend -> nginx (proxies on $NGINX_PORT, default 8081)
```
Requires a root `.env` (copy `.env.example`) for `POSTGRES_*`, `DATABASE_URL`, and optional cloud storage vars.

### CI
GitHub Actions workflows (`ci.yml`, `docker-build.yml`, `deploy.yml`, `playwright.yml`) are all `workflow_dispatch`-only (manual trigger), not run automatically on push/PR.

## Required local files not in git

Large model weights and secrets are gitignored (see root and `backend/.gitignore`) and must be placed manually — the app fails to fully initialize without them:
- `backend/models/best.pt` — RT-DETR damage-detection model
- `backend/models/best-road-classifier.pt` (also referenced at `backend/best-road-classifier.pt`) — YOLO "is this a road photo" gatekeeper classifier
- `backend/models/ppi_rf_model_v3.pkl` — Random Forest priority-index model
- `backend/app/services/Road-maintain.json` — Google Earth Engine service account credentials
- `backend/.env` — see `.env.example` for required keys (`DATABASE_URL`, `GEE_*`, `JWT_SECRET_KEY`, `UPLOAD_DIR`, `ALLOWED_ORIGINS`, etc.)

If model files are missing, `ai_engine.load_model()` logs an error but the server still starts; endpoints that need the model degrade instead of crashing (see `AIEngine` in `backend/app/ai/engine.py`).

## Backend architecture

**Layout**: `app/core` (config/db/file utils), `app/reports` (report upload/listing/status models+router — note `app/reports/service.py` is currently empty; logic lives directly in `router.py`), `app/auth` (admin login, separate from the `User`/`UserRole` table in `reports/models.py`), `app/ai` (inference + fusion), `app/services` (GPS EXIF extraction, GEE credentials location).

**Two independent user tables** — a pre-existing split worth knowing about before touching auth: `app/auth/models.py` defines `AdminUser` (`admin_users` table, used by the actual `/api/auth/*` login flow), while `app/reports/models.py` also defines `User`/`UserRole` (officer/admin) and `ReportAction`/`SystemSetting` tied to it. The auth router only uses `AdminUser`; the `reports/models.py` `User` model exists but isn't wired to the login flow.

**Report lifecycle** (`app/reports/router.py`):
1. `POST /api/reports/upload` saves the file, resolves GPS (`latitude`/`longitude` form fields take priority, otherwise EXIF via `app/services/gps_extractor.py`), inserts a `RoadReport` row as `PROCESSING`, and immediately returns — AI analysis runs in a FastAPI `BackgroundTasks` job (`process_report_background`) rather than blocking the request.
2. The background job: checks a per-coordinate-grid cache (`ApiCacheGeeOsm`, keyed by lat/lon rounded to 3 decimals) before calling GEE/OSM again, computes 30-day crowdsourced report stats from nearby `RoadReport` rows, runs `ai_engine.calculate_priority_index`, writes an `AIAnalysis` row, and flips the report to `COMPLETED` or `REJECTED`.
3. The YOLO "is this actually a road" gatekeeper step and the NDVI GPS-mismatch anomaly check are both **intentionally commented out** in `engine.py`/`router.py` for offline batch-labeling — read the `[INTENTIONAL BYPASS]` comments before assuming they're bugs; there's a `TODO` to re-enable the gatekeeper post-labeling.
4. `router.py` has some rough edges inherited from iterative changes (e.g. a duplicated `save_upload_file` call in `upload_report`, two definitions of `get_stats` with dead code between the first and the `/` route) — check current behavior in the file rather than assuming it's clean before relying on it.

**AI / Multi-Fusion pipeline** (`app/ai/`): `engine.py`'s `AIEngine.calculate_priority_index` is late fusion across:
- `predict_damage` — RT-DETR CV inference (damage ratio, severity by class `D00/D10/D20/D40`, annotated image saved alongside the original)
- `gee_integration.py` — Google Earth Engine (rainfall, soil moisture, NDVI, surface material, slope) and OSM/OSMnx (road type, lanes, speed limit, POI/community-impact score)
- `fusion_engines.py` — three independent scoring engines (`HeuristicFusionEngine`, `FuzzyFusionEngine` via `scikit-fuzzy`, and an ML `RandomForestRegressor`-based engine) all fed the same `RoadReportData`; `ml_engine`'s score (`ml_score`) is currently the one used as `primary_score`/`final_decision`, with heuristic/fuzzy scores stored alongside for comparison.

Health check: `GET /api/health`. Static uploads served at `/uploads` from `settings.UPLOAD_DIR`.

## Frontend architecture

React 19 + Vite, React Router for two disjoint route trees in `src/App.jsx`:
- Public/user: `/` (`UserDashboard`), `/report` (`UserReportPage`)
- Admin: `/login` (`AdminLoginPage`, unauthenticated) and `/admin/*` under `AdminLayout`, gated by `ProtectedRoute` (checks JWT via `services/authService.js`) — `dashboard`, `priority-reports`, `reports/:id`, `map`, `ai` (data validation).

Component folders mirror the admin pages they belong to (`components/admin-dashboard`, `components/admin-GISmap`, `components/admin-priority/admin-prioritydetail`, `components/admin-datavalidation`). `src/mock/*` holds mock data still used by some components — check whether a component reads from `services/api.js` (real backend) or a mock file before assuming it's live.

`services/api.js` builds request URLs from `VITE_API_BASE_URL` (empty by default, meaning same-origin via the Vite dev proxy to `/api`). The GIS map (`admin-GISmap/`) uses `react-leaflet` + `leaflet.heat` against `GET /api/reports/map/points`.

A root `package.json` (with `antd`/`lucide-react`/`react-router-dom`) is separate from `frontend/package.json` — the actual frontend app lives entirely under `frontend/`.
