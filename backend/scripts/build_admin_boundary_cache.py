"""
build_admin_boundary_cache.py
------------------------------
Builds cached_admin_boundaries.parquet from the local OSM .pbf extract,
for use by app/ai/gee_integration.py: get_admin_location() (point-in-polygon
lookup of province/district/subdistrict).

Unlike build_gis_cache.py (roads/POIs, small per-point bounding boxes), this
extracts at WHOLE-COUNTRY extent with no bounding box -- tested directly and
confirmed a small (~7.7km) per-point box returns zero boundaries, since
province/district polygons are far larger than that. complete_relations=True
is required: without it, pyrosm returns clipped/incomplete polygon geometry
for any relation whose member ways extend beyond the extraction extent,
which would corrupt point-in-polygon results near boundary edges.

This is a heavier one-time operation than the per-point road/POI cache
builds -- budget real time for it, run once, not per-dataset.

Usage (run from backend/):
    python scripts/build_admin_boundary_cache.py [--pbf data/thailand-latest.osm.pbf] [--output-dir .]
"""

import argparse
import os
import sys

from pyrosm import OSM

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except AttributeError:
    pass  # reconfigure() unavailable on some stdout wrappers; fall back silently

ADMIN_LEVELS_TO_KEEP = ['4', '6', '8']  # province (จังหวัด) / district (อำเภอ) / subdistrict (ตำบล)


def build_cache(pbf_path: str, output_dir: str):
    if not os.path.exists(pbf_path):
        sys.exit(
            f"❌ OSM extract not found: {pbf_path}\n"
            f"   Download the Thailand extract from Geofabrik "
            f"(https://download.geofabrik.de/asia/thailand.html) and place it there."
        )

    print(f"Building admin boundary cache from {pbf_path} (whole-country extent, complete_relations=True)...")
    print("This is a heavier one-time operation than the per-point road/POI caches -- expect it to take a while.")

    # NO bounding_box -- whole-country extent, unlike build_gis_cache.py.
    # complete_relations=True belongs on the OSM() constructor, not get_boundaries() --
    # confirmed via inspect.signature() after the first attempt raised TypeError putting it
    # on get_boundaries() (which doesn't accept it in this pyrosm version).
    osm = OSM(pbf_path, complete_relations=True)
    boundaries = osm.get_boundaries(boundary_type='administrative')

    if boundaries is None or boundaries.empty:
        sys.exit("❌ No boundaries extracted -- cache would be empty. Aborting.")

    print(f"Extracted {len(boundaries)} total boundary relations.")
    print("Raw admin_level breakdown:")
    print(boundaries['admin_level'].value_counts())

    filtered = boundaries[boundaries['admin_level'].isin(ADMIN_LEVELS_TO_KEEP)].copy()
    if filtered.empty:
        sys.exit(f"❌ None of the target admin levels {ADMIN_LEVELS_TO_KEEP} were found. Aborting.")

    for level, label in [('4', 'province'), ('6', 'district'), ('8', 'subdistrict')]:
        n = (filtered['admin_level'] == level).sum()
        print(f"  admin_level={level} ({label}): {n} polygons")
        if n == 0:
            print(f"  ⚠️ No {label}-level boundaries found -- admin_{label} will be NULL for all reports.")

    out_path = os.path.join(output_dir, 'cached_admin_boundaries.parquet')
    filtered.to_parquet(out_path)
    print(f"✅ Saved {len(filtered)} boundary polygons to {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pbf", default="data/thailand-latest.osm.pbf", help="Path to local OSM .pbf extract")
    parser.add_argument("--output-dir", default=".", help="Where to write cached_admin_boundaries.parquet")
    args = parser.parse_args()
    build_cache(args.pbf, args.output_dir)
