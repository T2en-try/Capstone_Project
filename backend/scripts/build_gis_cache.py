"""
build_gis_cache.py
-------------------
Builds cached_driving_network.parquet and cached_pois.parquet from a local
OSM .pbf extract, for the coordinates found in a manifest CSV (a column
containing "latitude"/"longitude" per row, e.g. a Supabase/report export).

Required before running any batch AI pipeline that calls get_road_type()/
get_poi_data() in app/ai/gee_integration.py — those functions read these
parquet files directly and silently fall back to defaults (speed_limit=50.0,
lanes=2, highway_type='unknown') if the cache is missing or a road segment
isn't tagged, so build the cache first and check the coverage summary below.

Usage (run from backend/):
    python scripts/build_gis_cache.py --source-csv <path/to/manifest.csv> \
        [--pbf data/thailand-latest.osm.pbf] [--output-dir .]
"""

import argparse
import os
import sys

import pandas as pd
import geopandas as gpd
from pyrosm import OSM

# Windows consoles often default to a non-UTF-8 codepage (e.g. cp874 on Thai
# locale installs), which crashes on the emoji used in status messages below.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except AttributeError:
    pass  # reconfigure() unavailable on some stdout wrappers; fall back silently


def build_cache(source_csv: str, pbf_path: str, output_dir: str):
    if not os.path.exists(source_csv):
        sys.exit(f"❌ Source CSV not found: {source_csv}")
    if not os.path.exists(pbf_path):
        sys.exit(
            f"❌ OSM extract not found: {pbf_path}\n"
            f"   Download the Thailand extract from Geofabrik "
            f"(https://download.geofabrik.de/asia/thailand.html) and place it there."
        )

    print(f"Building OSM cache from {source_csv} using {pbf_path} ...")
    df = pd.read_csv(source_csv)
    if "latitude" not in df.columns or "longitude" not in df.columns:
        sys.exit("❌ Source CSV must have 'latitude' and 'longitude' columns.")

    all_edges, all_pois = [], []

    # Round to 1 decimal (~11km grid cells) to dedupe nearby points into shared extracts
    df["lat_r"] = df["latitude"].round(1)
    df["lon_r"] = df["longitude"].round(1)
    unique_coords = df[["lat_r", "lon_r"]].drop_duplicates().values

    padding = 0.06  # covers the full +/-0.05 deg range of each rounded coordinate
    print(f"Total unique ~10km grid areas to process: {len(unique_coords)}")

    for i, (lat, lon) in enumerate(unique_coords):
        bounding_box = [lon - padding, lat - padding, lon + padding, lat + padding]
        print(f"[{i + 1}/{len(unique_coords)}] Extracting OSM data for grid {lat}, {lon}...")
        try:
            osm = OSM(pbf_path, bounding_box=bounding_box)
            edges = osm.get_network(network_type="driving", nodes=False)
            if edges is not None and not edges.empty:
                all_edges.append(edges)

            custom_filter = {
                "amenity": ["hospital", "clinic", "school", "university"],
                "shop": ["supermarket", "convenience", "mall"],
            }
            pois = osm.get_data_by_custom_criteria(
                custom_filter=custom_filter, keep_nodes=True, keep_ways=True, keep_relations=False
            )
            if pois is not None and not pois.empty:
                all_pois.append(pois)
        except Exception as e:
            print(f"⚠️ Error processing grid {lat}, {lon}: {e}")

    if not all_edges:
        sys.exit("❌ No driving-network edges extracted — cache would be empty. Aborting.")

    final_edges = pd.concat(all_edges).drop_duplicates(subset=["id"])
    final_edges = final_edges.drop(columns=["tags"], errors="ignore")
    edges_path = os.path.join(output_dir, "cached_driving_network.parquet")
    final_edges.to_parquet(edges_path)
    maxspeed_coverage = final_edges["maxspeed"].notna().mean() * 100 if "maxspeed" in final_edges else 0.0
    print(f"✅ Saved {len(final_edges)} edges to {edges_path}")
    print(f"   maxspeed tag coverage: {maxspeed_coverage:.1f}% "
          f"(rows without it fall back to speed_limit=50.0 at query time)")

    if all_pois:
        final_pois = pd.concat(all_pois).drop_duplicates(subset=["id"])
        final_pois = final_pois.drop(columns=["tags"], errors="ignore")
        pois_path = os.path.join(output_dir, "cached_pois.parquet")
        final_pois.to_parquet(pois_path)
        print(f"✅ Saved {len(final_pois)} POIs to {pois_path}")
    else:
        print("⚠️ No POIs extracted — cached_pois.parquet was not written.")

    print("Cache build complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source-csv", required=True, help="CSV with latitude/longitude columns to build coverage for")
    parser.add_argument("--pbf", default="data/thailand-latest.osm.pbf", help="Path to local OSM .pbf extract")
    parser.add_argument("--output-dir", default=".", help="Where to write the two .parquet files")
    args = parser.parse_args()
    build_cache(args.source_csv, args.pbf, args.output_dir)
