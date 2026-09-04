# Production Migration Log — Random Forest Decision Head

Records the full sequence that replaced the synthetic-data-trained `MLFusionEngine`
(`ml_engine`, in `app/ai/fusion_engines.py`) with the validated Random Forest Decision
Head (`priority_class_rf_v1.pkl`, trained in `sprint4/decision_heads/`) as the
production final-decision path, plus the two significant incidental findings this
work surfaced. Written so this doesn't have to be reconstructed from chat history.

## Why this happened

`ai_engine.calculate_priority_index()` previously used `MLFusionEngine`, a
`RandomForestRegressor` trained on 2,000 **synthetic** rows (`fusion_engines.py`'s
`_train_and_save()`) whose target was literally `HeuristicFusionEngine.predict_ppi()`
plus Gaussian noise — never trained on or validated against a single real expert
label, despite sharing an algorithm family with (and no other relation to) the
Decision Heads research work in `sprint4/decision_heads/`. The decision was made to
replace it with that research RF (the one that scored 35.7% Critical recall / 61.0%
accuracy in the 6-way Decision Head comparison), refit on the full 200-image
expert-labeled sample for deployment, and to return a discrete `priority_class`
(matching `GT_priority_class`'s 1/2/3 convention) plus a real `confidence_score`
from `predict_proba()`, instead of forcing a continuous synthetic score through
fixed thresholds.

## Sequence

### Step 1 — Train and save the production model

`sprint4/decision_heads/scripts/08_train_production_rf.py`: refit
`RandomForestClassifier(n_estimators=200, random_state=42)` — same hyperparameters
as the research script, **no `class_weight`**, confirmed the canonical research RF
never used one — on all 200 labeled images (no held-out fold; this is deployment,
not evaluation). Saved via `joblib.dump()` as a dict (model + `feature_names` +
`class_labels` + provenance metadata, not a bare classifier) to
`backend/models/priority_class_rf_v1.pkl`. Reload verified in a fresh process
against a real sample row before proceeding.

**Dependency pinning caught early**: `backend/requirements.txt` had `scikit-learn`
completely unpinned. Latest PyPI (1.9.0) was already one version ahead of what
trained the pickle (1.8.0) — a live risk, not hypothetical, since a fresh
`docker compose up --build` today would have installed a different version than
what saved the model. Pinned to `scikit-learn==1.8.0`.

### Step 2 — Schema

`app/reports/models.py`, `AIAnalysis`: added `priority_class` (new `PriorityClass`
enum, int-valued 1/2/3 matching `GT_priority_class`, stored as a native Postgres
enum by member name), `confidence_score`, and — after a follow-up check found a
single `confidence_score` float insufficient for CASP's planned aggregation —
`proba_normal` / `proba_warning` / `proba_critical` (the full 3-class distribution).
`final_fusion_score` / `final_decision` kept (deprecated, loosened to nullable) for
backward compatibility with CASP/heatmap/frontend consumers not yet migrated.

### Step 3 — Feature-mapping layer

New module: `app/ai/feature_mapping.py`. Maps the live pipeline's raw outputs
(`predict_damage()`, `get_environment_data()`, `get_road_type()`, `get_poi_data()`)
into the exact 20-column schema the saved RF expects. Every categorical mapping is
traced to the exact script that produced the research dataset's corresponding
column (not invented fresh):
- `road_type` one-hot ← `pipeline_run/scripts/05_stratified_sampling.py`'s Thai-string
  category mapping, applied to `get_road_type()`'s existing `thai_road_type`.
- `speed_limit_band` / `speed_limit_is_estimated` ← the exact `bucket_speed_limit()`
  logic from `backend/scripts/backfill_speed_limit_source.py`.
- `surface_material_*` one-hot ← combined from `09_backfill_surface_material.py` +
  `backfill_surface_material_encoding.py`'s category maps.

**Real gap found and fixed**: `gee_integration.py`'s `get_road_type()` already
loaded `cached_driving_network.parquet` (for speed_limit/road_type/lanes) but never
read its `surface` OSM tag column, despite the column existing with real 19%
coverage. The live `estimated_surface_material` field (Sentinel-2-derived) is
documented elsewhere as 94% blank and superseded by this exact OSM-tag approach for
the research dataset — that fix had never been ported into the live pipeline. Added
`surface_osm_tag` to `get_road_type()`'s return, sourced by the new mapping module.

**Verification**: `FEATURE_ORDER` checked byte-for-byte against the saved model's
`feature_names` (exact match, programmatically). `predict_priority()` asserts input
column order matches before calling `.predict()` — confirmed this actually raises
on a deliberately broken row, not just passes on the happy path. Tested against
real coordinates through the live `get_road_type()`, not just synthetic dicts.

**Two fields flagged as lower-confidence** (`community_impact_score`,
`rainfall_12m_mm`/`soil_moisture` — assumed equivalent to their live counterparts
by naming, unlike surface_material) were later **fully confirmed empirically**:
traced `07_prepare_airtable_csv.py` and found the research dataset's values for
these three fields are literal SQL pulls from `ai_analyses`' own historical columns
for those 200 reports, not independently derived. Cross-checked 12 real
Image_ID→report_id pairs, live DB vs. research CSV: 12/12 exact numeric matches
across all three fields. Git history confirms the underlying formulas (POI score,
CHIRPS rainfall, SMAP soil moisture) have been unchanged since this file's first
commit.

### Step 4 — Wire into `engine.py`

`calculate_priority_index()`: replaced the `ml_engine`-driven threshold block with
`build_feature_row()` → `predict_priority()`. `heuristic_score`/`fuzzy_score`/
`ml_score` still computed, now purely informational. `final_fusion_score`
(deprecated) is now `Σ proba[c] × PRIORITY_ANCHORS[c]` (Normal=0/Warning=50/
Critical=100) — a single shared constant in `feature_mapping.py`, not a second
hardcoded copy, so this and CASP's formula (below) can't silently drift apart.
`final_decision` reuses the exact old string values so `router.py`'s
`_classify_damage_level()` keyword matching needed zero changes.

**Verified**: full live GPU + live GEE end-to-end run against a real image;
`PriorityClass` enum round-trip tested against a fresh schema built via this
project's own `tests/conftest.py` pattern before ever touching the live DB.

## Major incidental finding #1 — live DB schema drift (found while verifying Step 4)

Testing the `PriorityClass` round-trip against the live `road_reports_batch_db`
failed — not on anything new, but on `osm_way_id`, a column that predates this
session's work. `information_schema` comparison showed the live table was missing
**11 columns** `models.py` declares: 7 new to this session (the RF/NDVI columns)
plus **4 pre-existing** (`osm_way_id`, `admin_province`, `admin_district`,
`admin_subdistrict`) that had nothing to do with this work.

Because SQLAlchemy's ORM selects/inserts every mapped column by default, this
meant **every read and write through the reports API was broken** against this
database with the current code — `GET /api/reports/{id}`, `GET /api/reports/`,
`GET /api/reports/map/points`, and any new upload would all fail. Confirmed via a
two-database check on this Postgres server (`road_reports_batch_db`, 1,382 rows,
active through Aug 7; `road_reports_db`, 12 rows, stale since mid-July — the latter
matches the `.env.example` template name and appears abandoned, left untouched).

**Fixed**: additive `ALTER TABLE ai_analyses ADD COLUMN ...` for all 11 columns
(4 pre-existing + 7 new), applied only to the active database. Verified via the
exact previously-failing SELECT/UPDATE round-trip (now passes) and a live smoke
test of all three read endpoints through the real app (all 200, correct row
counts). Team notified this may explain unexplained blockage in other in-progress
work (e.g. Road-Segment Aggregation, which depends on `osm_way_id`).

## Major incidental finding #2 — the old PPI score was severely miscalibrated

Comparing old (`final_fusion_score`, from the synthetic-trained `ml_engine`) against
new (RF-derived) values across all 1,381 backfilled reports:

| | Old (`ml_engine`) | New (validated RF) |
|---|---|---|
| Mean | 83.98 | 45.88 |
| Median | 95.63 | 48.50 |
| % scoring ≥50 ("Critical-range") | **88.5%** | **43.7%** |

The old scorer was flagging the large majority of all reports as Critical-range,
consistent with it never having been validated against real expert judgment (it
was trained to imitate a hand-written heuristic formula plus noise). This means
**the admin dashboard's `final_decision` display and the CASP map's priority
signal have likely been showing an inflated, unreliable picture since those
features went live** — anyone who made decisions based on "which areas look
Critical" before this migration should treat that as suspect. Not a mistake by
anyone — the old model was simply never checked against ground truth. Fixed going
forward (new reports use the validated RF); historical reports were backfilled
with corrected values (see below), so the dashboard now reflects accurate numbers.
Team notified directly, this is not just a footnote.

## Backfill — 1,381 of 1,382 historical reports

`backend/scripts/backfill_priority_class_rf.py`. Does not re-run CV inference or
re-fetch GEE (no images, no network calls) — reuses already-stored `AIAnalysis`
columns for CV/rainfall/soil-moisture/community-impact, and re-runs only
`get_road_type()` (fast local-cache lookup, no network) for the two fields that
were never persisted historically (`speed_limit_source`, `surface_osm_tag`),
following the exact precedent already established by
`backfill_speed_limit_source.py`. Dry-run by default; tested on a 10-row sample
(verified DB state matched exactly) before the full run.

**Result**: 1,381/1,382 updated, 0 errors. The one skip is the sole no-GPS
partial-success report (correctly excluded, no location to derive context from);
76 `REJECTED` reports also correctly excluded (nothing meaningful to backfill).
Resulting class distribution: Normal 22.7% / Warning 61.6% / Critical 15.7% —
consistent with (not identical to, different population) the 200-image research
ground truth's 35.0/51.0/14.0% split, a reassuring implicit sanity check on the
whole feature-mapping pipeline. 0/1,381 rows have `proba_normal + proba_warning +
proba_critical` deviating from 1.0 by more than 0.001.

## Part 2 — CASP's `avg_ppi` formula

`app/analytics/router.py`: `avg_ppi` now averages, per grid cell, each report's
`Σ proba[c] × PRIORITY_ANCHORS[c]` (same shared constant as Step 4's deprecated
`final_fusion_score` — deliberately not a second independently-arbitrary mapping),
reading `priority_class`/`proba_*` directly from `AIAnalysis` instead of the
deprecated `final_fusion_score`. Reports with `priority_class IS NULL` are dropped
from the mean (verified via a synthetic test: excluded correctly, not counted as
0; all-NULL cell returns 0.0 with no division error — no live case exists yet to
trigger this, since the one NULL row is already outside CASP's own query filters).
`cus` and everything else in the formula are untouched — confirmed independent of
this change (built purely from report count/density/recency, never touches any AI
score).

**Verified**: response JSON shape unchanged (same 17 grid-cell fields,
same types) against `GridLayer.jsx`/`GridPriorityTable.jsx`/`TopPriorityAreas.jsx`'s
existing contract — zero frontend changes required. Real grid-cell comparison
reflects the same old-vs-new gap as the backfill (old avg_ppi running far hotter
than new), consistent with major finding #2 above, not a new discrepancy specific
to CASP.

## Follow-up — Gatekeeper re-enable + frontend wiring (Phase B close-out)

Written after the sequence above; the "What's deliberately NOT done" section below
still applies except where superseded here.

### Gatekeeper re-enabled

`process_report_background`'s Gatekeeper (`ai_engine.validate_is_road()`) was
bypassed for the offline expert-labeling batch (see git history / the old
`[INTENTIONAL BYPASS]` comment). Re-checked before re-enabling: model file present
(`backend/best-road-classifier.pt`), `validate_is_road()` unchanged since its
original Phase 1 live verification -- no drift.

Uncommented, with the rejection handled the only way it can be from inside a
`BackgroundTasks` job: the `POST /upload` response has already been sent (`201`,
`ai_result: null`, always -- confirmed by reading the endpoint, not just assumed)
by the time the classifier runs, so there is no synchronous HTTP error path
available. A rejection sets `report.status = REJECTED` and returns early, skipping
the GEE/OSM/RF work entirely for a non-road image -- mirroring the pre-existing
"`ai_analysis is None` → REJECTED" fallback already in the same function.
Confirmed `status: "rejected"` was already a fully-supported value end to end
(`StatusBadge.jsx`, the public report feed, `ReportDetailModal.jsx`) before this
change landed -- not a newly-introduced or untested path.

### `rejection_reason` column added

Re-enabling the Gatekeeper turns REJECTED-with-no-reason from a rare edge case
into a common outcome. Added `RoadReport.rejection_reason` (nullable
`VARCHAR(50)`) -- on `RoadReport`, not `AIAnalysis`, because a Gatekeeper
rejection can happen before any `AIAnalysis` row exists at all. Set at all four
places `status` becomes `REJECTED`:
- Gatekeeper: `"not_a_road"`
- `ai_analysis is None` fallback: `"analysis_failed"`
- The background task's outer exception handler (a fourth site found during this
  work, same category as the fallback above): `"analysis_failed"`
- Admin manual rejection (`PATCH /{id}/status`): left `NULL` -- `ReportUpdateStatus`
  doesn't collect a reason today, confirmed by reading the schema; the endpoint now
  clears any stale `rejection_reason` when an admin moves a report *off*
  `REJECTED` to another status, so an old reason can't linger and mislead later.

Live DB migration: additive `ALTER TABLE road_reports ADD COLUMN rejection_reason
VARCHAR(50)` on the active database (same schema-drift risk as major finding #1
above -- the ORM declares the column immediately, so every read/write would have
broken without this). Verified via a full round-trip through the real ORM +
Pydantic (`ReportResponse`) against the live DB, not just a raw SQL check.

Surfaced via `ReportResponse.rejection_reason` (API) and
`ReportDetailModal.jsx` (a small danger-styled banner, reusing the same block
pattern as the existing GPS-anomaly banner, shown only when `status === 'rejected'`
with a label keyed off the reason code).

### `priority_class`/`confidence_score`/`proba_*` wired to the frontend

Confirmed `AIAnalysisResponse` (schemas.py) never declared these fields despite
them being real, populated `AIAnalysis` columns since Step 2/the backfill above --
Pydantic's `from_attributes=True` silently drops anything not declared, so they
were invisible to the API. Added all five to `AIAnalysisResponse`, plus
`confidence_score` to `ReportResponse.ai_result`'s `fusion_result` dict (the shape
`ReportDetailModal.jsx`/`AiResultModal.jsx` actually consume).

Frontend change scoped to `ReportDetailModal.jsx` only -- the sole live consumer;
`AiResultModal.jsx` has an identical block but is unreachable in the current flow
(`ai_result` is always `null` in the upload response, since AI runs in the
background after it's sent) and was deliberately left untouched. Added a
confidence-score line to the existing "สรุปผลการประเมิน" card, not a new
`priority_class` display -- `engine.py` already sets
`final_decision = FINAL_DECISION_LABELS[priority_class]`, so the card's existing
headline already *is* the priority_class label; a second display would have been
redundant. `GridLayer.jsx`/CASP/`analytics/router.py` untouched, confirmed out of
scope.

### Incidental finding #3 — stale `final_decision`/`final_fusion_score` on backfilled rows, and the fix

Verifying the confidence-score addition against real historical data surfaced a
new mismatch: the original backfill (above) deliberately never touched
`final_decision`/`final_fusion_score` -- they were left holding the *old*
synthetic-`ml_engine` values while `priority_class` next to them held the *new*
RF value. Queried live: only 188/1,381 rows had a `final_decision` that actually
agreed with `FINAL_DECISION_LABELS[priority_class]`. Concretely, e.g. 216 rows
were `priority_class=NORMAL` while `final_decision` still read "Critical".

This wasn't cosmetic-only: `router.py`'s `_classify_damage_level()` (used by
`GET /api/reports/map/points`, the heatmap) keyword-matches on `final_decision`
text, so the stale strings were also feeding an inflated severity classification
into the heatmap for these rows -- a second, previously-unnoticed surface of major
finding #2's "old scorer ran far hotter" problem.

**Fixed**: extended `backfill_priority_class_rf.py` with a `--sync-decision` mode
that recomputes `final_decision` (via `FINAL_DECISION_LABELS`) and
`final_fusion_score` (via the same `PRIORITY_ANCHORS`-weighted expected-value
formula `engine.py`/CASP already use) purely from each row's already-stored
`priority_class`/`proba_*` -- no RF re-inference, no GEE/OSM calls, pure
arithmetic. `FINAL_DECISION_LABELS` moved from `engine.py` into
`feature_mapping.py` alongside `PRIORITY_ANCHORS` so this script (and anything
else) can import the single source of truth instead of a second copy.

Dry-run on a 10-row sample, applied to that sample, verified the write landed,
then ran on the remaining 1,371. **Result: 1,371 updated, 10 already consistent
(the sample) = 1,381/1,381.** Re-ran the same consistency query used to find the
mismatch: every row's `final_decision` now agrees with its `priority_class`
(NORMAL↔"Good", WARNING↔"Warning", CRITICAL↔"Critical", 0 exceptions). Recomputed
`final_fusion_score`'s distribution (mean 45.88, median 48.5, 43.66% ≥ 50) matches
the RF-derived numbers already reported in major finding #2 above, as expected
since it's the same formula.

## What's deliberately NOT done in this sequence

- **`road_reports_db`** (the stale, 12-row database) was left untouched —
  confirmed abandoned (no activity since mid-July, missing several tables), not
  worth the same fix unless something later shows it's actually in use.
- **`ml_score`** still computes via the old synthetic `ml_engine`, purely
  informational now — not retired, since other things may still reference it and
  retiring it wasn't in scope.
- **CASP's `CUS` formula and `density_score`'s known placeholder** (currently a
  duplicate of `count_score` — "in a real scenario you'd use actual road area,"
  per the code's own comment) were left alone — explicitly out of scope, belongs
  to the teammate who designed CASP.

## Follow-up — AIAnalysis normalization (1 parent + 7 satellite tables)

`AIAnalysis` had grown to 41 columns across this project's history (CV, GEE, GIS/
OSM, POI, crowdsource, priority-decision, and deprecated-legacy fields all on one
row). Split into a slimmed parent (`id`/`report_id`/`model_version`/`analyzed_at`)
plus 7 satellite tables (`ai_cv_features`, `ai_gee_context`, `ai_gis_context`
[includes `admin_province/district/subdistrict` — same source, too small for its
own table], `ai_poi_context`, `ai_crowdsource_context`, `ai_priority_decision`
[includes `gps_anomaly_flagged/reason` — an active feature, not deprecated, so
deliberately not bundled with the legacy fields below], `ai_legacy_scores`
[isolated specifically so a future full removal is a single `DROP TABLE`]), each
1:1 via a shared primary key (`analysis_id`, both PK and FK to `ai_analyses.id`,
`ondelete="CASCADE"`).

Traced the full blast radius before writing any code: ~12 query call sites across
`router.py`/`analytics/router.py`/`scripts/diagnose_casp.py`, plus every
read/write of the 37 field names (`schemas.py`'s Pydantic `from_attributes`, the
CASP module, the `reprocess_report_location` update block, backfill scripts,
the frontend contract). Chose `association_proxy` (all 37 old flat names kept
readable *and* writable on `AIAnalysis`, delegating to the correct satellite) +
`lazy="selectin"` on all 7 relationships (every query that loads an
`AIAnalysis` row auto-fetches all 7 satellites via small batched queries,
regardless of whether the call site asks) specifically to collapse the blast
radius down to a single call site — the one `AIAnalysis(...)` insert
constructor in `router.py` — instead of rewriting ~40+ read/write sites to a
nested path.

**Migration, incremental and additive-only**: (1) `CREATE TABLE` the 7
satellites — doesn't touch `ai_analyses`. (2) `scripts/migrate_ai_analysis_split.py`,
dry-run first (10-row sample → applied → `--verify` correctly reported 0
mismatches + a "missing" count matching the exact expected math for the
not-yet-migrated remainder, confirming the diff logic itself before trusting it
on the full set) → full run on the remaining 1,451 rows → full `--verify`:
1,461 rows × 7 satellites, 54,057 field comparisons, 0 missing, 0 mismatches.
Independently cross-checked via raw SQL (not the script's own counters): all 7
tables at exactly 1,461 rows, JSONB field spot-checked byte-identical. (3) Only
after that full verification, switched `models.py` + the one insert site over.
Old wide columns on `ai_analyses` deliberately left in place, not dropped —
rollback window, per this session's established discipline.

### Gotcha #1 — a shadowed-Column bug that a diff review would not have caught

Wiring the switch step (`association_proxy` + relationships) without first
*removing* the original 37 flat `Column(...)` definitions still sitting earlier
in the same `AIAnalysis` class body caused the association_proxy assignments to
silently shadow the Columns of the same name — plain Python class-body
attribute overwrite, not a SQLAlchemy error. The mapper simply stopped treating
those 37 as real table columns; the generated `INSERT` only included
`report_id, model_version, analyzed_at`. This produced no import error, no
mapper-configuration error (`Base.registry.configure()` passed cleanly), and no
static/lint signal of any kind — it only surfaced as a live `IntegrityError` on
the very first real upload after the switch. **Worth documenting explicitly as
a gotcha for anyone doing a similar SQLAlchemy normalization**: when replacing
a wide model's Columns with `association_proxy` delegating to new satellite
tables, the old Column definitions for those same names must be deleted in the
same step, not just "shadowed later in the file" — and a diff review alone is
unlikely to catch the omission, since both the added and (accidentally
un-removed) code are individually valid. Live e2e execution — an actual upload,
not just an import/mapper-configuration check — is what caught it here.

### Gotcha #2 — a second live-DB/models.py drift, same failure class as major finding #1

The `IntegrityError` above was two stacked problems, not one. After fixing the
shadowing, the resulting minimal `INSERT INTO ai_analyses (report_id,
model_version, analyzed_at)` still failed: `final_fusion_score`/`final_decision`
carried a live `NOT NULL` constraint that `models.py` had claimed (in a comment,
"loosened to nullable") was already relaxed — it apparently never was actually
applied to the live database. Fixed additively (`ALTER TABLE
ai_analyses ALTER COLUMN ... DROP NOT NULL` on both — a loosening, matching what
`models.py` already declared, not a new decision).

**This is the same failure class as major finding #1 above** (the
`osm_way_id`/`admin_province`/`admin_district`/`admin_subdistrict` columns
`models.py` declared that the live table was missing entirely) — the live DB
and `models.py` have now drifted apart **twice** in this project's history, in
two different ways (missing columns, then a stale constraint). That's a
pattern, not a one-off. **Recommendation for the team**: a periodic (e.g.
CI-run) schema-parity check comparing `models.py`'s declared columns/
nullability against the live `information_schema` would have caught both
incidents before they ever reached a live upload — worth considering as a
follow-up, independent of anything else in this log.

**Re-verification after both fixes** (same 3 e2e scenarios as the Gatekeeper
work, plus new checks specific to this refactor): normal upload → `completed`,
full response diffed field-by-field against the pre-switch baseline (identical
except crowdsource-derived fields, which legitimately shifted from more test
data accumulating, not a regression); Gatekeeper rejection → unchanged
(`rejected`/`not_a_road`, still short-circuits before the normalized
construction); CASP → `200`, same `avg_ppi` distribution shape; `PATCH
/{id}/location` (the `reprocess_report_location` 25-line `existing.<field> = ...`
block) → same `AIAnalysis` row updated in place, `ndvi_index`/`priority_class`/
`confidence_score` correctly recomputed via `association_proxy` writes onto
already-persisted satellite rows; explicitly hit `/map/points` (spans 3
satellites in one response) and the report list/stats endpoints looking for
`MissingGreenlet` — none, anywhere, across the whole session; `pytest` 12/14,
same 2 pre-existing/unrelated failures as every prior checkpoint, zero new
regressions. DB-level spot check: new rows leave the old wide columns `NULL`
(nothing writes them now) while historical rows keep their original wide-column
data fully intact — the rollback snapshot is exactly as designed.

## Follow-up — pre-existing GEE identifier exposure in git history (accepted risk, not fixed)

Found during a pre-push security audit's full-history scan (`git log -S`, not
just the current tree): 3 old commits (`4264998`, `325b476`, `d6c29d7`) contain
a real GEE service-account email
(`road-remaining-life-prediction@sturdy-web-472311-a8.iam.gserviceaccount.com`)
and GCP project ID (`sturdy-web-472311-a8`), later genericized to placeholders
in a subsequent commit -- `backend/.env.example` at current `HEAD` only has
the generic placeholder, confirmed via `git grep` against `HEAD`. This
**predates this session entirely** and was already on `origin/main` (public)
before any of this session's work began -- not something introduced by, or
fixable through, anything pushed this session.

**No private key or other actual credential accompanies it** -- `Road-
maintain.json` itself (the file with the real credential) was confirmed via
the same full-history scan to have never been committed, at any point, on any
branch. A service-account email and project ID function more like a username
than a password: Google's own security model treats the private key as the
credential, not the account identity, which routinely appears in IAM
policies and logs.

**Decision: not rotating now.** Rotating would mean generating a new service
account, swapping `Road-maintain.json` on every teammate's machine, and
updating GEE IAM permissions -- real coordination cost for a low-severity
identifier-only exposure, not proportional to the project's remaining
timeline. Logged here as a known, accepted-risk item: if the team wants
extra defense-in-depth later (or before a more permanent/public release),
rotating this service account remains a straightforward option -- nothing
about leaving it as-is forecloses that.

## Follow-up — Cloud Image URL (S3-compatible dual-write)

**⚠️ Implemented by Claude Code as investigation/scaffolding for Phase C's
"Cloud Image URL" item — needs that teammate's review and sign-off before
merging. Not a unilaterally-decided feature; the storage-mode decision below
was made by the user in-session, not inferred.**

### Why this happened

`boto3==1.35.0` had been sitting in `requirements.txt` unused since before this
session (under a `# --- Cloud Storage & Postgres ---` header), and
`CLOUD_ENDPOINT`/`CLOUD_ACCESS_KEY`/`CLOUD_SECRET_KEY`/`BUCKET_NAME` were
already passed through in `docker-compose.yml` and listed (empty) in the root
`.env.example` — all staged for this feature, never wired up. `file_utils.py`'s
`StorageService.save_file()` had a literal `# TODO: S3 Cloud Storage
Integration (to be implemented by teammate)` stub. Investigation (this
session) confirmed: none of the 4 settings were declared on `Settings` in
`app/core/config.py`, no `image_url`-equivalent column existed on `RoadReport`,
and a full-history `git log -S"AKIA"` + `.env.example` diff scan turned up no
real AWS-style credentials ever committed, at any point.

### Storage-mode decision: dual-write, not S3-only

`process_report_background()` and `reprocess_report_location()` both require a
**local file path** — `ai_engine.validate_is_road()`, `ai_engine.predict_damage()`,
and `ai_engine.calculate_priority_index()` all read `file_info["path"]`/
`os.path.join(settings.UPLOAD_DIR, report.image_filename)` directly off disk.
A strict "S3 when configured, else local" branch would have left no local file
for RT-DETR/Gatekeeper to read once cloud settings were present, and would have
broken `reprocess_report_location` for any already-S3-stored report. Decision
(confirmed with the user): `StorageService.save_file()` **always** writes to
local disk exactly as before (zero changes needed anywhere in the AI pipeline),
and **additionally** uploads to S3-compatible storage when all 4 `CLOUD_*`
settings are non-empty, returning the resulting URL. Local disk remains the
source of truth for processing; the S3 URL is purely for display.

### Changes

- `app/core/config.py`: added `CLOUD_ENDPOINT`/`CLOUD_ACCESS_KEY`/
  `CLOUD_SECRET_KEY`/`BUCKET_NAME`, all `os.getenv("X", "")` with no `raise` —
  matches the `GEE_*` graceful-degrade pattern, not the `DATABASE_URL`/
  `JWT_SECRET_KEY` hard-raise pattern. The app boots fine with all 4 empty.
- `app/reports/models.py`: added `RoadReport.image_url` (`String(500)`,
  nullable). `image_filename` is unchanged and still required — it remains the
  local working-copy reference used by the AI pipeline and by
  `AiCvFeatures.annotated_image_filename`'s sibling logic.
- `app/core/file_utils.py`: `StorageService.__init__` builds a `boto3` S3
  client (path-style addressing, via `endpoint_url=CLOUD_ENDPOINT` — generic
  S3-compatible, not AWS-specific) only when `_cloud_configured()` is true.
  `save_file()` writes local disk unconditionally (unchanged from before),
  then calls `_upload_to_s3()`; a failed/absent upload returns `None` and does
  **not** fail the request — the local file already succeeded and remains
  fully usable via the existing `image_filename`/`/uploads` path. Returned
  dict gained a `"url"` key.
- `app/reports/schemas.py`: `ReportResponse` gained `image_url: Optional[str]`.
- `app/reports/router.py`: `upload_report` now passes
  `image_url=file_info.get("url")` when constructing `RoadReport`.

### Existing rows / migration step (not yet applied to the live DB)

`init_db()` (`app/core/database.py`) only runs `Base.metadata.create_all` —
per the two schema-drift incidents logged above, this **does not** add columns
to tables that already exist live. The ~1,400+ existing `road_reports` rows
need this additive statement run manually against the live DB before this
code is deployed there:

```sql
ALTER TABLE road_reports ADD COLUMN image_url VARCHAR(500);
```

New rows get `image_url` automatically (`NULL` unless cloud settings are
configured at upload time); existing rows simply get `NULL` and keep working
exactly as today via `image_filename` + `/uploads` — nothing about this change
touches or requires touching historical rows. Not run as part of this session
(no live DB access here) — flagging as the one deployment step this feature
still needs.

### Explicitly not done in this pass

- No frontend changes — `ReportResponse.image_url` is now available for the
  frontend to prefer over `/uploads/{image_filename}` when present, but no
  frontend component was touched. See `docs/FRONTEND_GUIDE.md`.
- No backfill of `image_url` for existing local-only images (i.e. no bulk
  upload of the ~1,400 existing files to cloud storage) — out of scope here,
  and a separate cost/throughput decision for whoever owns this feature.
- `boto3` client construction happens once at `StorageService` singleton
  init (`storage_service = StorageService()` at import time) — if
  `CLOUD_*` values are added/changed later, the process needs a restart to
  pick them up, same as every other `Settings` value in this codebase (no
  hot-reload of env vars anywhere in `config.py`).

## Follow-up — Cloud deployment readiness pass (dockerignore, docker-compose startup bugs, frontend build deferred)

Full context, priority ordering, and every option considered lives in
`docs/DEVOPS_GUIDE.md` §3 — this entry is the changelog-style record of what
actually changed, per this project's established pattern.

### Finding 1 (most severe) — no `.dockerignore` anywhere, real secret-leak risk

Neither `backend/` nor `frontend/` had a `.dockerignore`. Both Dockerfiles do
`COPY . .`. Concretely: a developer following the README's local-dev setup
(`backend/.env` created from `.env.example`, `venv/` created *inside*
`backend/` per `cd backend && python -m venv venv`) who then runs
`docker compose up --build` (build context for `backend` is `./backend`, per
`docker-compose.yml`) would have `.env` — real `JWT_SECRET_KEY`,
`DATABASE_URL` credentials, GEE service-account details — copied straight
into an image layer. If that image is ever pushed to a registry, the secret
persists in layer history permanently, retrievable even after a later layer
"deletes" the file. Same failure category as the GEE-identifier git-history
exposure logged above, different channel (image layers vs. commits), and
this one is push-button easy to trigger by accident, not a one-time mistake.

**Fixed**: added `backend/.dockerignore` and `frontend/.dockerignore`,
excluding `.env`/`.env.*` (keeping `!.env.example`), `venv/`, `__pycache__/`,
`.pytest_cache/`, `*.db`, `uploads/`, `cache/`, `scratch/`, `tests/`,
`pytest.ini`, `node_modules/`, `dist/`, Playwright artifacts, and dev-only
logs/CSVs/sample images. Also excluded `backend/data/` — this holds
`thailand-latest.osm.pbf` (~325MB), the raw OSM source used only to *build*
the `*.parquet` GIS caches offline (`scripts/build_gis_cache.py`,
`scripts/build_admin_boundary_cache.py`); the app never reads this file at
runtime, only the parquet outputs, which live at the `backend/` root and are
**not** excluded.

**Deliberately no root-level `.dockerignore`**: `docker-compose.yml`'s
`build: ./backend` / `build: ./frontend` means each service's build context
is its own subdirectory, not repo root — Docker only reads a `.dockerignore`
from the root of the build context in use. A root-level file would never be
consulted and would only create a false sense of coverage.

### Finding 2 — `docker-compose.yml` startup bugs: 3 env vars missing, 1 hardcoded

`backend.environment` was missing `JWT_SECRET_KEY` entirely (the
already-documented bug — `config.py` raises on import without it, crashing
the container at startup) **and**, discovered while fixing it,
`GEE_SERVICE_ACCOUNT`/`GEE_KEY_PATH`/`GEE_PROJECT_ID` were missing too.
`app/ai/gee_integration.py`'s `init_gee()` raises `ValueError`/`RuntimeError`
if any of those 3 is missing or invalid, and `main.py`'s `lifespan` calls it
unguarded (no `try/except`) — **identical failure class to `JWT_SECRET_KEY`**,
not a graceful degrade. `docs/DEVOPS_GUIDE.md` previously stated GEE vars
were optional; that was wrong (my own error when writing that doc earlier
this session) and has been corrected there.

Separately, `ALLOWED_ORIGINS` was hardcoded to
`"http://localhost,http://localhost:5173"` directly in `docker-compose.yml`
rather than sourced from `${ALLOWED_ORIGINS}`. Harmless for local
`docker compose up` (where `localhost` is exactly the right origin), but
would silently CORS-reject every request from a real deployed frontend
domain, no matter what `.env` says.

**Fixed**: `backend.environment` now reads
```yaml
JWT_SECRET_KEY: ${JWT_SECRET_KEY}
ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
GEE_SERVICE_ACCOUNT: ${GEE_SERVICE_ACCOUNT}
GEE_KEY_PATH: ${GEE_KEY_PATH}
GEE_PROJECT_ID: ${GEE_PROJECT_ID}
```
Root `.env.example` and `backend/.env.example` both updated with these keys
and comments explaining which are hard startup requirements.

### Finding 3 — `frontend/Dockerfile` still runs `npm run dev`, plus a Vite `allowedHosts` risk

Confirmed (not yet fixed): `vite.config.js` sets `server.host: '0.0.0.0'` but
never sets `server.allowedHosts`. Vite (pinned to v8 here) defaults to
rejecting requests whose `Host` header isn't `localhost`/an IP/an explicitly
allowed host, as DNS-rebinding protection. `nginx/nginx.conf` forwards the
real client `Host` header unmodified to the frontend container
(`proxy_set_header Host $host;`). Locally that header is always `localhost`
so this never surfaces; behind a real domain it's very likely a 403. This
compounds the already-known "dev server isn't a production image" problem
with a second, independent reason the current frontend container would
likely not work once actually deployed.

**Explicitly deferred, not fixed, by direct instruction this session**:
frontend development is still in progress; switching to a production build
now would go stale the moment new frontend work lands. `frontend/Dockerfile`
was **reverted back to its original `npm run dev -- --host` form** after a
production-build version (multi-stage `node:20-alpine` build → `nginx:alpine`
static serve on port 5173, with a `try_files $uri $uri/ /index.html;`
SPA-fallback config) was drafted and then explicitly rolled back mid-session
per the user's scope-change instruction. **Do not redo this work without
checking with the frontend team that they're ready** — the plan above is
ready to apply as soon as they are; re-deriving it isn't necessary, re-doing
it prematurely just wastes the work a second time.

### Verification

`docker build -f backend/Dockerfile backend` run against a live Docker
daemon in this session (Docker Desktop was not running at the start of the
session; started it, confirmed daemon reachable, then ran the real build --
not just a syntax check). Build succeeded (~11 min, full dependency install,
exit code 0). Then actually inspected the built image rather than trusting
the Dockerfile text:
- `.dockerignore` exclusions confirmed by running `ls`/existence checks
  *inside* the built image: `.env`, `venv`, `data`, `uploads`, `cache`,
  `scratch`, `tests`, `road_reports.db` all confirmed absent.
- Required assets confirmed present in the same way: `models/
  priority_class_rf_v1.pkl`, `best-road-classifier.pt`, all 3 `.parquet`
  caches, `app/services/Road-maintain.json` all confirmed present.
- `JWT_SECRET_KEY`'s existing startup guard re-tested inside the built image
  (`docker run` with no env vars) -- fires exactly as before, no regression
  from the `.dockerignore`/docker-compose changes.

This same verification pass is what surfaced the missing `bcrypt`/`jose`
dependency finding immediately below -- caught precisely because a real
container was run, not just a diff read back.

Frontend build/`docker compose up` full-stack verification **not** run this
pass — `frontend/Dockerfile` is unchanged from before this session (reverted,
per above), so there was nothing new on the frontend side to verify, and
running the full stack wasn't needed to validate the backend-only changes.

## Follow-up — missing `bcrypt`/`python-jose` dependencies (found via the Docker verification above, not Docker-specific)

### What was missing

`app/auth/utils.py` imports `bcrypt` (password hashing) and `jose`
(`python-jose`, JWT encode/decode) directly at module level. **Neither
package was listed in `requirements.txt`, at all.** Discovered while
verifying the Docker fixes above: running `python -c "import main"` inside a
container built from a genuinely fresh `pip install -r requirements.txt`
raised `ModuleNotFoundError: No module named 'bcrypt'` before the app could
even finish importing -- before `JWT_SECRET_KEY`'s check, before
`init_db()`, before anything else in this log gets a chance to matter.

### Why it was masked

Every dev's local venv apparently already had `bcrypt`/`python-jose`
installed -- most likely a leftover from some earlier dependency (or a
manual `pip install` during initial auth development) that was never removed
even after whatever originally pulled it in changed. Nobody had rebuilt from
a truly clean environment since `app/auth/utils.py` started depending on
them directly, so `requirements.txt` silently drifted out of sync with what
the code actually imports -- the exact same failure shape as the
`scikit-learn` unpin incident logged earlier in this file, just on a
dependency nobody had reason to suspect until a clean-room build forced it
to the surface.

### Fix

Determined the exact versions a fresh install resolves to (`python:3.12`,
matching `backend/Dockerfile`'s base image): `bcrypt==5.0.0`,
`python-jose==3.5.0` (installed via the `[cryptography]` extra, pulling
`cryptography==50.0.1`). Added to `requirements.txt` under a new `# ---
Auth ---` section, pinned (not left unpinned) -- matching this project's
existing precedent of pinning specifically the dependencies that have
already caused a real problem (`scikit-learn==1.8.0`), rather than pinning
everything or nothing:
```
bcrypt==5.0.0
python-jose[cryptography]==3.5.0
```

### Re-verification

Rebuilt the backend image with `docker build --no-cache` (not reusing any
layer from the earlier ad-hoc-patched container -- a genuinely clean build
from the updated `requirements.txt`) and confirmed the app now imports and
proceeds past the previous failure point without any manual intervention.

### Not just a Docker problem -- affects local dev too

This bug is independent of Docker entirely. Anyone setting up a fresh local
venv (`python -m venv venv && pip install -r requirements.txt`, per the
README's own documented setup) whose environment doesn't happen to already
have `bcrypt`/`python-jose` installed as a side effect of something else
will hit this exact same `ModuleNotFoundError` running the backend locally.
Flagged prominently in `docs/DEVOPS_GUIDE.md` for this reason -- it belongs
in the "how to run this locally" story, not just the Docker one.

## Follow-up — bake-into-image confirmed (not reverted-then-redecided) + CPU-only torch fix

### Why this came up again

A teammate (Thana) merged PR #38 ("fix deploy configuration and cloud storage
setup") on top of the earlier push, motivated by Docker build times. It
switched `backend/.dockerignore` to *exclude* `models/`/`*.pt`/`*.pkl`/
`*.parquet`/`Road-maintain.json` from the image and added per-file
`docker-compose.yml` bind mounts for each of them instead -- the opposite of
the bake-into-image decision already recorded in this log. Push was blocked
(non-fast-forward) before this was noticed; investigated the overlap file by
file rather than merging blind. Full root-cause investigation (separate
session turn, no files changed) found: **the build-time complaint almost
certainly misdiagnosed the cause**. `backend/Dockerfile` already orders
`COPY requirements.txt .` / `RUN pip install` *before* `COPY . .`, so a
normal (non-`--no-cache`) rebuild reuses the `pip install` layer entirely
regardless of code or asset changes -- verified empirically: a cached rebuild
with nothing changed finished in under a minute, with `apt-get`,
`COPY requirements.txt .`, and `RUN pip install` all showing `CACHED`, only
`COPY . .` re-running (0.6s). The ~165MB of baked-in models/GIS-caches costs
~0.6s at that `COPY . .` step -- not the multi-minute cost anyone was
actually experiencing. Reported this to the user, who took it back to Thana;
**team agreed to keep bake-into-image and fix the real root cause instead**.

### Real root cause: unpinned `torch`/`torchvision` pulling full CUDA wheels

Every *cold* build (`--no-cache`, or a fresh clone/CI runner with no prior
layer cache) was paying for `torch`/`torchvision` resolving their default
CUDA-bundled wheels -- `nvidia-cublas`, `nvidia-cudnn`, `cuda-toolkit`,
`triton`, and ~15 more `nvidia-*`/`cuda-*` packages -- despite this project's
deploy target having no GPU. This, not the model files, was the actual
multi-minute cost.

### Fix

Added to the top of `requirements.txt`:
```
--extra-index-url https://download.pytorch.org/whl/cpu
```
(`--extra-index-url`, not `--index-url`, so every other package still
resolves from PyPI as normal -- only `torch`/`torchvision` pull from this
index.) Confirmed via a real install what this actually resolves to on this
project's Python version (3.12): `torch==2.14.0+cpu`,
`torchvision==0.29.0+cpu` -- pinned to these exact versions, matching the
project's existing pattern of pinning dependencies that have caused or could
cause a real problem (`scikit-learn==1.8.0`), not leaving them open-ended.
Also pinned `ultralytics==8.4.138` and `opencv-python-headless==5.0.0.93` (a
`DEVOPS_GUIDE.md` recommendation from earlier this session, previously
unaddressed) to the versions a fresh resolve already produced.

**CUDA-safety check, done before assuming this was safe**: grepped the
entire backend for `.cuda()`, `device_map`, `.half()`, `torch.device`, and
`cuda` more broadly. Exactly one hit outside library code:
`app/ai/engine.py:37` --
`device = 'cuda' if torch.cuda.is_available() else 'cpu'` -- already
conditional. On a CPU-only build, `torch.cuda.is_available()` simply returns
`False`; no crash, no other GPU-specific assumption anywhere in the AI
pipeline. Nothing needed patching.

### Verification -- measured, not assumed

**Cold build** (`docker build --no-cache`, wrapped in `time` for a genuine
wall-clock measurement of the whole command, not just BuildKit's own
per-step timers):
- New CPU-only cold build: **7m12s (432s) total**; the `pip install` layer
  itself: 316.2s (~5.3 min).
- Previous baseline (this session, same method of reading BuildKit's step
  timers, both pre-CPU-pin cold builds): `pip install` step alone was 676.7s
  and 699.0s (~11.3-11.65 min) across the two earlier cold builds; adding the
  image-export step each time (304.9s / 300.7s) put full cold-build wall time
  at roughly 16.4-16.7 minutes total both times.
- Net: **cold build time roughly cut in half or better** (~16.5 min -> 7m12s
  total; ~11.5 min -> 5.3 min for the dependency-install step specifically).
- Confirmed via the install log: only `nvidia-ml-py` (a small monitoring
  library `ultralytics` itself depends on, not a CUDA runtime package) got
  installed this time, vs. the full `nvidia-*`/`cuda-*`/`triton` set before.
- **Image size: 12.8GB -> 5.26GB** (more than halved), consistent with no
  longer shipping unused CUDA runtime libraries.

**Warm-cache build** (nothing changed since the prior build, normal caching):
finished in **1.01 seconds**, all 6 layers `CACHED` including `COPY . .` --
confirms the already-correct Dockerfile layer ordering still gives the fast
path with the new pin in place.

### Merge resolution -- what was kept from PR #38, what was reverted

Merged `origin/main` (PR #38 + the earlier README-only commit) into local
`main` with `git merge --no-commit` first, to inspect and adjust before
finalizing rather than accepting the merge result blind.

**Kept as-is** (clean, additive, no conflict with the bake-into-image
decision):
- `.env.example`: `POSTGRES_DB`/`DATABASE_URL` corrected to
  `road_reports_batch_db` (the actual live database name -- see the
  two-database incident earlier in this log).
- `.gitignore`: additional exclusions (`.env.*`, cache/coverage directories,
  `docker-compose.override.yml`, etc.) -- no overlap with either
  `.dockerignore`.
- `.github/workflows/ci.yml`: adds a `frontend-e2e` job running Playwright --
  directly matches this document's own earlier recommendation to wire E2E
  into CI. Still `workflow_dispatch`-only (the "no automatic trigger" gap
  remains open).
- Frontend feature/test files: `UserDashboard.jsx`, a new Playwright spec
  (`frontend/src/tests/user-dashboard.spec.js`), `package.json`/
  `package-lock.json`/`playwright.config.js` updates.
- `frontend/Dockerfile` + new `frontend/nginx.conf`: a multi-stage
  production build (`node:20-alpine` -> `nginx:alpine`, serving on the same
  port 5173) -- left exactly as merged, **not confirmed production-ready by
  the frontend team** (Thana said it was a draft). Not touched either
  direction this pass; whoever confirms frontend readiness should revisit
  `DEVOPS_GUIDE.md` §3's architecture note.

**Reverted back to the bake-into-image version** (this session's changes,
not PR #38's):
- `backend/.dockerignore`: removed PR #38's added exclusions for `models/`,
  `*.pt`, `*.pth`, `*.pkl`, `*.parquet`, `*.pbf`, `app/services/*.json`,
  `Road-maintain.json` -- these assets stay baked into the image.
- `docker-compose.yml`: removed the 6 per-file `bind` volume-mount entries
  PR #38 added for the model/cache/credential files. **Kept**
  `backend_uploads:/app/uploads` (a named volume) and the `UPLOAD_DIR:
  /app/uploads` env var PR #38 also added -- deliberately, since that volume
  is for persisting *user-uploaded report photos* across container
  restarts/redeploys, a real and separate concern from the model/asset-baking
  question. Without it, every redeploy would silently wipe every previously
  uploaded report image regardless of which asset-delivery strategy wins.
  Flagged this interpretation explicitly to the user rather than deciding
  silently, since it wasn't itemized in the merge instructions.
