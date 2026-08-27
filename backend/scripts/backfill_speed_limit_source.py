"""
backfill_speed_limit_source.py
-------------------------------
Re-checks every row of a labeled-dataset CSV (must have image_id/latitude/
longitude columns) against the current GIS cache and classifies each row's
speed_limit into a provenance bucket, using the same get_road_type() the
live backend uses. Reports the distribution so you can decide whether
speed_limit is salvageable as a feature or needs to be dropped/flagged.

Does not modify the source CSV. Writes a sibling *_speed_limit_source.csv
with per-row results (image_id, latitude, longitude, speed_limit,
speed_limit_source, osm_highway_type) for further inspection.

Usage (run from backend/):
    python scripts/backfill_speed_limit_source.py \
        [--source-csv <path/to/stratified_sample.csv>] [--output-csv <path>]
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

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.ai.gee_integration import get_road_type  # noqa: E402

DEFAULT_SOURCE_CSV = (
    r"C:\Capstone-Project\sprint4\Fine-tuned-fix-D40\model_retraining"
    r"\ppi-fields-app\metadata\stratified_sample.csv"
)

CATEGORY_NOTES = {
    "osm_tag": "real maxspeed tag found on the matched road segment",
    "default_no_tag": "road matched within radius, but no maxspeed tag on it",
    "default_no_road_nearby": "cache loaded fine, but no road within the distance threshold",
    "default_no_cache": "cached_driving_network.parquet missing/empty/unreadable",
    "error": "an exception occurred during lookup (e.g. bad coordinate)",
}

# Any source other than a real OSM tag collapses to "unknown_estimated" — the point is to
# never let a fabricated/default number blend in with genuine tagged values. Boundaries
# chosen to match common Thai posted limits (20/30/40/50/60/80/90/100/120 km/h); adjust if
# your real-tag distribution turns out to need finer bins than this 3-way split.
SPEED_LIMIT_BAND_EDGES = [(30, "≤30"), (45, "40"), (float("inf"), "≥60")]


def bucket_speed_limit(speed_limit, source):
    """Bucket a speed_limit into a small ordinal category, or 'unknown_estimated'
    if it isn't backed by a real OSM tag."""
    if source != "osm_tag" or pd.isna(speed_limit):
        return "unknown_estimated"
    for upper_bound, label in SPEED_LIMIT_BAND_EDGES:
        if speed_limit <= upper_bound:
            return label
    return "unknown_estimated"  # unreachable given the inf upper bound, kept for safety


def backfill(source_csv: str, output_csv: str):
    if not os.path.exists(source_csv):
        sys.exit(f"❌ Source CSV not found: {source_csv}")

    df = pd.read_csv(source_csv)
    missing_cols = [c for c in ("image_id", "latitude", "longitude") if c not in df.columns]
    if missing_cols:
        sys.exit(f"❌ Source CSV is missing required column(s): {missing_cols}")

    print(f"Re-checking {len(df)} rows from {source_csv} against the current GIS cache...\n")

    results = []
    for _, row in df.iterrows():
        lat, lon = row["latitude"], row["longitude"]
        if pd.isna(lat) or pd.isna(lon):
            results.append({
                "image_id": row["image_id"], "latitude": lat, "longitude": lon,
                "speed_limit": None, "speed_limit_source": "no_coordinates",
                "osm_highway_type": None,
            })
            continue

        road = get_road_type(lat, lon)
        results.append({
            "image_id": row["image_id"],
            "latitude": lat,
            "longitude": lon,
            "speed_limit": road["speed_limit"],
            "speed_limit_source": road["speed_limit_source"],
            "speed_limit_is_estimated": road["speed_limit_source"] != "osm_tag",
            "speed_limit_band": bucket_speed_limit(road["speed_limit"], road["speed_limit_source"]),
            "osm_highway_type": road["osm_highway_type"],
        })

    result_df = pd.DataFrame(results)
    result_df.to_csv(output_csv, index=False)
    print(f"✅ Per-row results written to {output_csv}\n")

    counts = result_df["speed_limit_source"].value_counts()
    total = len(result_df)

    print("=== speed_limit_source distribution ===")
    for category, note in CATEGORY_NOTES.items():
        n = int(counts.get(category, 0))
        pct = 100 * n / total if total else 0.0
        print(f"  {category:<26} {n:>4} / {total}  ({pct:5.1f}%)  — {note}")
    other = total - sum(int(counts.get(c, 0)) for c in CATEGORY_NOTES)
    if other:
        print(f"  {'no_coordinates':<26} {other:>4} / {total}  — row had no lat/lon to check")

    print("\n=== speed_limit_band distribution (engineered feature) ===")
    band_counts = result_df["speed_limit_band"].value_counts()
    for label in ["≤30", "40", "≥60", "unknown_estimated"]:
        n = int(band_counts.get(label, 0))
        pct = 100 * n / total if total else 0.0
        print(f"  {label:<18} {n:>4} / {total}  ({pct:5.1f}%)")

    real_pct = 100 * counts.get("osm_tag", 0) / total if total else 0.0
    print(f"\nReal OSM-tagged speed_limit coverage: {real_pct:.1f}% of rows.")
    if real_pct < 30:
        print("⚠️  Below ~30% real coverage — speed_limit as currently computed is dominated by a")
        print("   constant default and is unlikely to carry real signal for the 5 Decision Heads.")
        print("   Consider: dropping it, replacing it with a road_type-based proxy, or keeping it")
        print("   only alongside speed_limit_source so a model/analysis can down-weight defaulted rows.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source-csv", default=DEFAULT_SOURCE_CSV, help="Labeled-dataset CSV with image_id/latitude/longitude")
    parser.add_argument("--output-csv", default="speed_limit_source_backfill.csv", help="Where to write per-row results")
    args = parser.parse_args()
    backfill(args.source_csv, args.output_csv)
