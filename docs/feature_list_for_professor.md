# Feature List — 5 Decision Heads (stratified_sample.csv, n=200)

This document lists the features feeding the 5 Decision Heads, and explains
the two fields that needed special handling before use. Generated from the
200-image stratified sample (`stratified_sample.csv`); backfill/encoding
scripts live in `backend/scripts/`.

## Raw features (used as-is)

| Feature | Source |
|---|---|
| `cv_max_severity_score` | RT-DETR damage detection (`app/ai/engine.py`) |
| `cv_damage_ratio_percent` | RT-DETR damage detection (`app/ai/engine.py`) |
| `road_type` | OSM `highway` tag, via local pyrosm/parquet cache (`app/ai/gee_integration.py: get_road_type()`) |
| `community_impact_score` | POI proximity (hospitals/schools/shops), via the same parquet cache (`get_poi_data()`) |
| `rainfall_12m_mm` | Google Earth Engine, CHIRPS daily precipitation (`get_environment_data()`) |
| `soil_moisture` | Google Earth Engine, NASA SMAP (`get_environment_data()`) |
| `osm_way_id` | OSM Way ID of the matched road segment, via the same pyrosm cache (`get_road_type()`) — added for road-segment aggregation, not previously stored (see below) |
| `admin_province` / `admin_district` / `admin_subdistrict` | จังหวัด/อำเภอ/ตำบล, point-in-polygon lookup against a new local pyrosm boundary cache (`get_admin_location()`) — see below |

## New fields — `osm_way_id` and administrative location

**`osm_way_id`**: previously computed transiently and discarded — `get_road_type()` looked up the nearest road edge but never read `nearest_edge["id"]`, so no stable "which road" identifier existed anywhere in the schema despite the data being present in the cache the whole time. Now extracted and persisted (`AIAnalysis.osm_way_id`, `BigInteger`). Chose `BigInteger` over `Integer` on concrete evidence, not just convention: the max Way ID already in our own cache is 1,544,078,647 — 72% of PostgreSQL's `INTEGER` ceiling (2,147,483,647) — and OSM Way IDs grow monotonically and globally.

**Administrative location**: investigated three possible sources before implementing. The existing road/POI parquet caches don't carry admin boundary tags (confirmed by direct column inspection). `get_environment_data()` (GEE) doesn't currently fetch this and would require a new live query per report. The approach actually implemented — **a new local `cached_admin_boundaries.parquet`**, built once from the existing `.osm.pbf` via `pyrosm.get_boundaries()` — avoids any new live API dependency, matching how `speed_limit`/`road_type` already work. One real implementation detail worth recording: a small per-point bounding box (the pattern used for the road/POI caches) returns **zero** boundaries, since province/district polygons are far larger than ~7.7km — this cache had to be built at whole-country extent with `complete_relations=True` (on the `OSM()` constructor, not `get_boundaries()` — the first attempt put it in the wrong place and failed with a clear `TypeError`, caught and fixed before this cache was ever used).

Live-tested against two real coordinates from this dataset's area: `admin_province` (`จังหวัดนครราชสีมา`) and `admin_district` (`อำเภอเมืองนครราชสีมา`) populated correctly for both. `admin_subdistrict` came back `None` for both — checked directly rather than assumed a bug: all 909 cached subdistrict polygons are geometrically valid, and a real subdistrict polygon exists near the test point, but doesn't actually cover it. Consistent with the pattern already documented above for `speed_limit`/`surface_material`: the finer the OSM tag/boundary granularity, the sparser real-world coverage tends to be — subdistrict is the finest of the three admin levels here. Not fixed further as part of this change; `admin_subdistrict` will legitimately be `NULL` for some fraction of reports, same treatment as the other sparse fields (real absence, not a fabricated placeholder).

**`road_name` fix, bundled into this same change**: fixed a bug where a road matched but missing its `name` tag produced the literal string `"nan"` (from `str()` on a NaN float) instead of a true `NULL` — same "fabricated-looking value masking real absence" pattern as `speed_limit`'s silent defaults. Checked the real rate before fixing: only 3.5% of the 200-sample coordinates hit the already-coded `"ไม่มีชื่อถนน"` placeholder, but **166/200 (83%)** actually had no usable name once the `"nan"`-string cases are counted too. The placeholder string itself was also collapsed to `None`, for the same reasoning — a database value should reflect "no data," not a pre-written string standing in for it. `road_name` should now be treated as unreliable/display-only (83% NULL), not a "which road" identifier — that's what `osm_way_id` is for.

## Engineered features (needed special handling)

### `speed_limit`

**Why it needed handling:** OSM's `maxspeed` tag is sparse on the road
network covering this sample's coordinates — only **0.8%** of all cached
road segments carry a `maxspeed` tag, and checking each of the 200 sample
points individually against the current cache gives **30.0%** real coverage
(60/200; the remaining 70% is a code-level default, not a measurement).
This is a genuine OpenStreetMap tagging-completeness gap in this region, not
a bug in the lookup.

**Verified, not just theorized** — two follow-up checks were run specifically
to rule out alternative explanations before trusting this number:

1. **GPS accuracy correlation (ruled out).** Checked whether poor
   `gps_accuracy_m` explains the two default categories most plausibly tied
   to a bad coordinate:
   - `default_no_road_nearby` (n=7, gated by the 200m match threshold): mean
     accuracy 17.4m / median 21.3m — not worse than `osm_tag` rows (mean
     23.8m / median 15.0m); if anything slightly better on mean.
   - The 9 `trunk`/`secondary` `default_no_tag` rows clustered in the
     Pak Chong area (the higher-class roads most likely to actually be
     tagged, making a miss more surprising): mean accuracy **7.2m**, the
     best-located points in the entire dataset.
   - **Conclusion: GPS error does not explain the pattern.** No change to
     the 200m distance threshold is warranted.
2. **Cross-field consistency (verified, one explained exception).** Since
   `road_type` and `speed_limit` come from the same `get_road_type()` call
   with the same 200m threshold, the 7 `default_no_road_nearby` rows should
   show `road_type = unknown` too. Checked directly: **6 of 7 are fully
   consistent** (`unknown` in both a fresh call and the original pipeline
   run). The 1 exception (`IMG_0377`) is explained, not a logic bug: its
   original `road_type` was computed in early August against the *original*
   12-grid/52,899-edge cache; this investigation rebuilt the cache narrower
   (8 grids/8,729 edges, scoped to just this 200-image sample) partway
   through, which dropped one road edge near that coordinate. Confirmed via
   `backend_results.csv` (the live backend's original output) that the real
   value was genuine, not a merge artifact. This was an artifact of the
   cache being rebuilt mid-investigation, not a threshold/logic mismatch
   between fields — going forward, `speed_limit`, `road_type`, and
   `surface_material` all query the same current cache and will stay
   consistent with each other.

**Encoding used** (`backend/scripts/backfill_speed_limit_source.py`):
- `speed_limit_band`: `≤30` / `40` / `≥60` / `unknown_estimated` — any row not backed by a real OSM tag collapses to `unknown_estimated`, so a fabricated default value can never look like real data to a model.
- `speed_limit_is_estimated`: boolean collapse of the same signal, for pipelines that just need a flag.
- `speed_limit_source` (diagnostic, 4-way): `osm_tag` / `default_no_tag` / `default_no_road_nearby` / `default_no_cache` — kept per-row for audit purposes even though the model-facing features are the two above.

**Measured distribution (n=200):**

| Band | Count | % |
|---|---|---|
| `≤30` | 27 | 13.5% |
| `40` | 20 | 10.0% |
| `≥60` | 13 | 6.5% |
| `unknown_estimated` | 140 | 70.0% |

### `surface_material`

**Why it needed handling, and why the story changed during review:** the
*original* `estimated_surface_material` field (backend `AIAnalysis` table,
Sentinel-2/GEE NDVI+reflectance classification — not OSM-derived at all) was
94% blank in this sample and, where present, only ever classified as
"dense vegetation," never Asphalt or Concrete. We initially treated that as
the field to encode, and separately investigated *why* it was blank via
`estimated_surface_material`'s fallback logic in `router.py`/`engine.py`
(which always assigns a string, `"ไม่ระบุ"`/"unspecified," and should never
leave the field truly blank). That fallback was introduced 2026-07-03,
**three weeks before** this batch ran (2026-07-26–07-29), which rules out a
simple "code fixed after the data was generated" explanation for the blank
values — the exact mechanism behind the GEE-side blanks remains
unresolved, but is now moot: **the team had already superseded that field**
with a different approach before we finished investigating it.

`pipeline_run/scripts/09_backfill_surface_material.py` replaces the
GEE-based field entirely with an **OSM `surface` tag lookup** — a
nearest-road spatial join against `cached_driving_network.parquet`, the
*same* cache `speed_limit` uses — producing `Surface Material` in
`09_airtable_ready_with_surface_test.csv` with real categories (Asphalt,
Concrete, Paving Stones, Unpaved, generic Paved) at **29.5%** coverage
(59/200) — nearly identical to `speed_limit`'s 30.0%. This confirms OSM tag
sparsity as the real, shared explanation for both fields once the correct
(OSM-tag-based) data source is used for `surface_material` — the original
GEE field's blank pattern is a separate, superseded issue and is not used
downstream.

**Encoding used** (`backend/scripts/backfill_surface_material_encoding.py`,
operating on `09_airtable_ready_with_surface_test.csv`'s `Surface Material`
column):
- `surface_material_asphalt`, `surface_material_concrete`, `surface_material_paving_stones`, `surface_material_unpaved`, `surface_material_paved_unspecified`: one-hot columns (all-zero for missing rows — do not read an all-zero row as "confirmed not this material").
- `surface_material_is_missing`: boolean flag, true when the nearest matched road has no OSM `surface` tag.

**Measured distribution (n=200):**

| Category | Count | % |
|---|---|---|
| `asphalt` | 27 | 13.5% |
| `concrete` | 13 | 6.5% |
| `paving_stones` | 0 | 0.0% |
| `unpaved` | 12 | 6.0% |
| `paved_unspecified` | 7 | 3.5% |
| `missing` | 141 | 70.5% |

## Summary for both fields

Neither field is dropped outright — both carry real signal (60 rows for
speed, 59 for material) worth keeping, and both now share the same
well-verified root cause: OpenStreetMap tag sparsity on the road network
covering this sample's area (~30% real coverage for both, independently
confirmed against GPS accuracy and cross-field consistency checks rather
than assumed). The one-hot/bucket + explicit missingness-flag pattern lets
the Decision Heads use the real signal where it exists while treating "we
don't know" as its own distinct, learnable state rather than silently
absorbing a fabricated constant as if it were measured data.

## Robustness fixes applied (no change to the numbers above)

Two defensive fixes were made while verifying this document, neither of
which altered any distribution reported here (re-run and confirmed
unchanged after each):

- `get_road_type()` (`app/ai/gee_integration.py`): the `except` block did
  not previously set `speed_limit_source`, so an unrelated exception (e.g.
  a bad coordinate) could silently inherit the pre-`try` `"default_no_cache"`
  default. Now sets an explicit `"error"` value instead. Verified 0/200 rows
  in this dataset were ever affected either way.
- `09_backfill_surface_material.py`: added `max_distance=200` to the
  `sjoin_nearest` call, matching `get_road_type()`'s existing threshold, so
  `surface_material` can no longer match a road that's arbitrarily far away.
  Re-run confirmed the distribution above is unchanged (the excluded rows
  had no `surface` tag on their nearest road anyway). Also fixed an
  unrelated pre-existing bug hit along the way: `07_airtable_ready.csv`
  already had its own `Surface Material` column (verified: identical,
  correct values, not a blank placeholder as first assumed — see
  correction below), so the merge produced silently-suffixed
  `Surface Material_x`/`_y` columns instead of one, and the script crashed
  referencing the now-ambiguous unsuffixed name. A naming bug, not a data
  corruption bug: a row-by-row check confirmed 0/200 mismatches between the
  pre-existing values and the freshly recomputed ones.
- **Airtable data status — verified live, resolved.** The hardcoded token
  (see below) was rotated in the Airtable dashboard, all 6 scripts that
  referenced it were updated to load it from `pipeline_run/.env` via
  `python-dotenv` instead, and the tree was re-scanned to confirm zero
  remaining hardcoded copies. Using the freshly-rotated token, all 200
  records' live `Surface Material` field were fetched directly from
  Airtable and compared against `07_airtable_ready.csv`: **0 missing, 0
  mismatches** — the merge-naming bug never reached production data.

## Resolved item: hardcoded Airtable token (unrelated to feature engineering)

While tracing the `surface_material` pipeline, a live Airtable API token was
found hardcoded in plaintext — not just in `10_patch_airtable_surface.py`,
but in 6 scripts total once the tree was searched
(`08_import_to_airtable_api.py`, `10_patch_airtable_surface.py`,
`11_patch_damage_ratio_test.py`, `12_patch_damage_ratio_full.py`,
`sanity_check.py`, `temp_check.py` — all copies of the same one token, not
6 different tokens). It never appeared anywhere in the actual git repo.

**Resolved**: the token was rotated in the Airtable dashboard (old token
deleted), all 6 scripts now load `AIRTABLE_TOKEN` from `pipeline_run/.env`
(gitignore not needed — the `sprint4` tree isn't under git at all, confirmed
via `git rev-parse --is-inside-work-tree`), and the tree was re-scanned to
confirm zero remaining hardcoded copies of the old token, including a
full-tree check for any other stray `.env` file (none found — only the one
just created).
