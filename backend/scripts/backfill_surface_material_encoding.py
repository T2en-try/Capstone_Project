"""
backfill_surface_material_encoding.py
--------------------------------------
Encodes the `Surface Material` column of 09_airtable_ready_with_surface_test.csv
(produced by pipeline_run/scripts/09_backfill_surface_material.py, which
nearest-joins each image's coordinate against the OSM `surface` tag in
cached_driving_network.parquet — the SAME cache used by
backfill_speed_limit_source.py) into a one-hot + is_missing feature set,
matching the speed_limit_band / speed_limit_is_estimated treatment.

NOTE: the original `material` column in stratified_sample.csv (from the
backend's AIAnalysis.estimated_surface_material, a Sentinel-2/GEE
classification) was 94% blank and is NOT what this script encodes -- that
field predates the team's own OSM-tag-based replacement (script 09) and is
documented as superseded in docs/feature_list_for_professor.md.

This does NOT re-query anything live -- it encodes whatever 09's output
already computed, for the same determinism reason as noted for speed_limit.

Usage (run from backend/):
    python scripts/backfill_surface_material_encoding.py \
        [--source-csv <path/to/09_airtable_ready_with_surface_test.csv>] [--output-csv <path>]
"""

import argparse
import os
import sys

import pandas as pd

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except AttributeError:
    pass  # reconfigure() unavailable on some stdout wrappers; fall back silently

DEFAULT_SOURCE_CSV = (
    r"C:\Capstone-Project\sprint4\Fine-tuned-fix-D40\model_retraining"
    r"\ppi-fields-app\metadata\09_airtable_ready_with_surface_test.csv"
)
ID_COLUMN = "Image_ID"
MATERIAL_COLUMN = "Surface Material"

# Maps raw "Surface Material" strings (Thai, as written by
# pipeline_run/scripts/09_backfill_surface_material.py's get_surface_mapping())
# to encoded categories. True NaN/blank (no OSM `surface` tag on the nearest
# matched road) is treated as missing.
MATERIAL_CATEGORY_MAP = {
    "ยางมะตอย (Asphalt)": "asphalt",
    "คอนกรีต (Concrete)": "concrete",
    "บล็อกปูถนน (Paving Stones)": "paving_stones",
    "ลูกรัง/ดิน (Unpaved)": "unpaved",
    "ทางลาดยาง/คอนกรีต (Paved)": "paved_unspecified",
}

CATEGORIES = ["asphalt", "concrete", "paving_stones", "unpaved", "paved_unspecified"]


def encode_material(raw_value):
    """Return (category_or_None, is_missing) for a raw material string."""
    if pd.isna(raw_value):
        return None, True
    category = MATERIAL_CATEGORY_MAP.get(str(raw_value).strip())
    if category is None:
        return None, True
    return category, False


def backfill(source_csv: str, output_csv: str):
    if not os.path.exists(source_csv):
        sys.exit(f"❌ Source CSV not found: {source_csv}")

    df = pd.read_csv(source_csv)
    if MATERIAL_COLUMN not in df.columns:
        sys.exit(f"❌ Source CSV has no '{MATERIAL_COLUMN}' column to encode.")
    id_col = ID_COLUMN if ID_COLUMN in df.columns else df.columns[0]

    print(f"Encoding surface_material for {len(df)} rows from {source_csv}...\n")

    categories, is_missing_flags = [], []
    for raw_value in df[MATERIAL_COLUMN]:
        category, is_missing = encode_material(raw_value)
        categories.append(category)
        is_missing_flags.append(is_missing)

    result_df = pd.DataFrame({
        id_col: df[id_col],
        "material_raw": df[MATERIAL_COLUMN],
        "surface_material_category": [c if c else "missing" for c in categories],
        "surface_material_is_missing": is_missing_flags,
    })
    for cat in CATEGORIES:
        result_df[f"surface_material_{cat}"] = [1 if c == cat else 0 for c in categories]

    result_df.to_csv(output_csv, index=False)
    print(f"✅ Per-row results written to {output_csv}\n")

    total = len(result_df)
    print("=== surface_material_category distribution ===")
    counts = result_df["surface_material_category"].value_counts()
    for cat in CATEGORIES + ["missing"]:
        n = int(counts.get(cat, 0))
        pct = 100 * n / total if total else 0.0
        print(f"  {cat:<20} {n:>4} / {total}  ({pct:5.1f}%)")

    missing_pct = 100 * result_df["surface_material_is_missing"].sum() / total if total else 0.0
    print(f"\nsurface_material_is_missing: {missing_pct:.1f}% of rows.")
    if missing_pct > 50:
        print("⚠️  Majority missing — surface_material one-hot columns will be all-zero for most")
        print("   rows; rely on surface_material_is_missing as an explicit signal rather than")
        print("   assuming a zero vector means 'confirmed not this material'.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source-csv", default=DEFAULT_SOURCE_CSV, help="Labeled-dataset CSV with a 'material' column")
    parser.add_argument("--output-csv", default="surface_material_encoding_backfill.csv", help="Where to write per-row results")
    args = parser.parse_args()
    backfill(args.source_csv, args.output_csv)
