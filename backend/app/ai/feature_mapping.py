"""
feature_mapping.py
----------------------
Maps the live pipeline's raw outputs (predict_damage() CV features,
get_environment_data() GEE context, get_road_type() GIS context, get_poi_data()
POI context) into the exact 20-column feature schema priority_class_rf_v1.pkl
was trained on (decision_heads/scripts/02_random_forest_decision_head.py's
build_model_matrix(), replicated column-for-column and category-for-category
against a saved production artifact -- see sprint4/decision_heads/scripts/
08_train_production_rf.py).

Category-derivation logic here is traced back to the exact script that
produced the research dataset's corresponding column, not invented fresh, so
the live and research feature definitions actually match:

  - road_type (Local/Main/Highway/Unknown): the Thai-string -> category
    mapping from sprint4/.../pipeline_run/scripts/05_stratified_sampling.py,
    applied to get_road_type()'s existing `thai_road_type` field. No live-
    pipeline change was needed for this one -- the field was already correct.
  - speed_limit_band + speed_limit_is_estimated: the exact bucket_speed_limit()
    logic from backend/scripts/backfill_speed_limit_source.py, applied to
    get_road_type()'s existing speed_limit / speed_limit_source fields.
  - surface_material_* one-hot + is_missing: the raw-OSM-tag -> category
    mapping combined from pipeline_run/scripts/09_backfill_surface_material.py's
    get_surface_mapping() + backend/scripts/backfill_surface_material_encoding.py's
    MATERIAL_CATEGORY_MAP, applied to `surface_osm_tag` -- a field added to
    get_road_type() (see gee_integration.py) specifically for this. The
    deprecated estimated_surface_material (Sentinel-2-derived) is documented
    as 94% blank and superseded by this exact OSM-tag approach for the
    research dataset; this ports the same fix into the live pipeline.

Two fields are taken as directly equivalent to their live counterparts based
on naming, NOT independently re-verified the way surface_material's problem
was discovered -- flagged here so this assumption is visible, not silently
baked in:
  - community_impact_score  <- poi["community_impact_score_pi"]
  - rainfall_12m_mm / soil_moisture <- gee["rainfall_last_12m_mm"] / gee["soil_moisture_last_30d_mm"]
"""

import pandas as pd

# Shared anchor values for converting a priority_class distribution into a single
# continuous 0-100 score (Normal=0/Warning=50/Critical=100, matching the old
# ml_engine's own decision thresholds for continuity). Single source of truth --
# used both for engine.py's deprecated final_fusion_score (kept populated for
# backward compat) and, later, CASP's avg_ppi expected-value aggregation --
# importing this one constant in both places avoids the two independently
# picking different anchor values and silently drifting apart.
PRIORITY_ANCHORS = {1: 0.0, 2: 50.0, 3: 100.0}

# Same single-source-of-truth reasoning as PRIORITY_ANCHORS above -- engine.py's
# calculate_priority_index() and any offline backfill/consistency script must derive
# the deprecated final_decision string from priority_class the exact same way, or
# the two can silently drift apart the way they historically did (see
# docs/production_migration_log.md's final_decision/priority_class mismatch finding).
FINAL_DECISION_LABELS = {
    1: "Good (สภาพปกติ)",
    2: "Warning (ควรเฝ้าระวัง)",
    3: "Critical (ต้องซ่อมแซมด่วน)",
}

# Column order MUST match priority_class_rf_v1.pkl's saved feature_names exactly --
# verified against the saved artifact in tests, not just asserted here by inspection.
FEATURE_ORDER = [
    "cv_max_severity_score", "cv_damage_ratio_percent", "community_impact_score",
    "rainfall_12m_mm", "soil_moisture", "speed_limit_is_estimated",
    "road_type_Local", "road_type_Main", "road_type_Highway", "road_type_Unknown",
    "speed_limit_band_≤30", "speed_limit_band_40", "speed_limit_band_≥60", "speed_limit_band_unknown_estimated",
    "surface_material_asphalt", "surface_material_concrete", "surface_material_paving_stones",
    "surface_material_unpaved", "surface_material_paved_unspecified", "surface_material_is_missing",
]

# Source: pipeline_run/scripts/05_stratified_sampling.py, the mapping that produced
# the research dataset's airtable_road_type column. Covers all 8 Thai strings
# gee_integration.py's get_road_type() can produce; anything else (raw/unknown
# highway tag) falls through to "Unknown", matching that script's .fillna('Unknown').
ROAD_TYPE_THAI_TO_CATEGORY = {
    "ถนนในพื้นที่": "Local",
    "ถนนในหมู่บ้าน/ชุมชน": "Local",
    "ซอย/ถนนบริการ": "Local",
    "ถนนสายรอง": "Main",
    "ถนนท้องถิ่น": "Main",
    "ถนนสายหลัก": "Highway",
    "ทางหลวงแผ่นดิน": "Highway",
    "ทางด่วนพิเศษ": "Highway",
}

# Source: backend/scripts/backfill_speed_limit_source.py's bucket_speed_limit().
SPEED_LIMIT_BAND_EDGES = [(30, "≤30"), (45, "40"), (float("inf"), "≥60")]

# Source: pipeline_run/scripts/09_backfill_surface_material.py's get_surface_mapping()
# + backend/scripts/backfill_surface_material_encoding.py's MATERIAL_CATEGORY_MAP,
# combined into a single raw-tag -> category step (skips their Thai-string
# intermediate, which the live pipeline has no other use for).
SURFACE_TAG_TO_CATEGORY = {
    "asphalt": "asphalt", "chipseal": "asphalt",
    "concrete": "concrete", "concrete:plates": "concrete", "concrete:lanes": "concrete",
    "paving_stones": "paving_stones", "cobblestone": "paving_stones",
    "unhewn_cobblestone": "paving_stones", "brick": "paving_stones",
    "unpaved": "unpaved", "compacted": "unpaved", "dirt": "unpaved", "sand": "unpaved",
    "gravel": "unpaved", "ground": "unpaved", "pebblestone": "unpaved",
    "paved": "paved_unspecified",
}


def _bucket_speed_limit(speed_limit, source):
    """Any source other than a real OSM tag collapses to 'unknown_estimated' --
    never let a fabricated/default number blend in with genuine tagged values."""
    if source != "osm_tag" or speed_limit is None:
        return "unknown_estimated"
    for upper_bound, label in SPEED_LIMIT_BAND_EDGES:
        if speed_limit <= upper_bound:
            return label
    return "unknown_estimated"  # unreachable given the inf upper bound, kept for safety


def build_feature_row(cv_features: dict, gee: dict, gis: dict, poi: dict) -> dict:
    """Returns a dict with exactly FEATURE_ORDER's 20 keys, in that order
    (Python dicts preserve insertion order), ready to become a single-row
    DataFrame for RandomForestClassifier.predict()/.predict_proba()."""
    road_type_category = ROAD_TYPE_THAI_TO_CATEGORY.get(gis.get("thai_road_type"), "Unknown")
    speed_limit_source = gis.get("speed_limit_source")
    speed_limit_is_estimated = speed_limit_source != "osm_tag"
    speed_limit_band = _bucket_speed_limit(gis.get("speed_limit"), speed_limit_source)
    surface_category = SURFACE_TAG_TO_CATEGORY.get(gis.get("surface_osm_tag"))  # None -> missing

    row = {
        "cv_max_severity_score": cv_features.get("cv_max_severity_score", 0),
        "cv_damage_ratio_percent": min(cv_features.get("cv_damage_ratio_percent", 0.0), 100.0),
        "community_impact_score": poi.get("community_impact_score_pi", 0.0),
        "rainfall_12m_mm": gee.get("rainfall_last_12m_mm", 0.0),
        "soil_moisture": gee.get("soil_moisture_last_30d_mm", 0.0),
        "speed_limit_is_estimated": int(speed_limit_is_estimated),
    }
    for cat in ["Local", "Main", "Highway", "Unknown"]:
        row[f"road_type_{cat}"] = int(road_type_category == cat)
    for band in ["≤30", "40", "≥60", "unknown_estimated"]:
        row[f"speed_limit_band_{band}"] = int(speed_limit_band == band)
    for cat in ["asphalt", "concrete", "paving_stones", "unpaved", "paved_unspecified"]:
        row[f"surface_material_{cat}"] = int(surface_category == cat)
    row["surface_material_is_missing"] = int(surface_category is None)

    assert list(row.keys()) == FEATURE_ORDER, (
        f"feature_mapping internal bug: built column order {list(row.keys())} "
        f"does not match FEATURE_ORDER {FEATURE_ORDER}"
    )
    return row


def predict_priority(row: dict, model_artifact: dict) -> dict:
    """model_artifact = the dict saved by 08_train_production_rf.py
    (joblib.load result: {'model', 'feature_names', 'class_labels', ...}).

    Asserts the row's column order matches the saved feature_names exactly
    before calling predict -- a silent column mismatch here would produce a
    confidently wrong prediction, not a loud error, so this check is
    load-bearing, not decorative.
    """
    feature_names = model_artifact["feature_names"]
    if list(row.keys()) != feature_names:
        raise ValueError(
            f"Feature order mismatch: built {list(row.keys())}, "
            f"model expects {feature_names}"
        )

    x = pd.DataFrame([row], columns=feature_names)
    model = model_artifact["model"]

    proba = model.predict_proba(x)[0]
    proba_by_class = dict(zip(model.classes_, proba))
    predicted_class = int(model.predict(x)[0])

    return {
        "priority_class": predicted_class,
        "confidence_score": float(proba_by_class[predicted_class]),
        "proba_normal": float(proba_by_class.get(1, 0.0)),
        "proba_warning": float(proba_by_class.get(2, 0.0)),
        "proba_critical": float(proba_by_class.get(3, 0.0)),
    }
