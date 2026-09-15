"""
build_grid_road_length_cache.py
-------------------------------
Reads cached_driving_network.parquet, overlays a 100x100m grid on the STUDY_AREA,
and calculates the total length of roads in each grid cell.
Saves the result to cached_grid_road_length.parquet for fast API access.
"""

import os
import sys
import pandas as pd
import geopandas as gpd
from shapely.geometry import box
import argparse

# Same logic as backend/app/analytics/router.py
STUDY_AREA = {
    "lat_min": 14.85,
    "lat_max": 14.92,
    "lon_min": 101.97,
    "lon_max": 102.07,
}
GRID_SIZE_DEG = 0.0009  # Approx 100m at equator

def get_grid_bounds(row: int, col: int):
    lat_min = STUDY_AREA["lat_min"] + (row * GRID_SIZE_DEG)
    lat_max = lat_min + GRID_SIZE_DEG
    lon_min = STUDY_AREA["lon_min"] + (col * GRID_SIZE_DEG)
    lon_max = lon_min + GRID_SIZE_DEG
    return lon_min, lat_min, lon_max, lat_max

def build_road_length_cache(input_parquet="cached_driving_network.parquet", output_parquet="cached_grid_road_length.parquet"):
    if not os.path.exists(input_parquet):
        sys.exit(f"Input file not found: {input_parquet}. Please run build_gis_cache.py first.")

    print(f"Loading road network from {input_parquet}...")
    roads_df = pd.read_parquet(input_parquet)
    # Convert to GeoDataFrame
    roads_gdf = gpd.GeoDataFrame(
        roads_df, 
        geometry=gpd.GeoSeries.from_wkt(roads_df['geometry']) if isinstance(roads_df['geometry'].iloc[0], str) else roads_df['geometry'],
        crs="EPSG:4326"
    )

    print("Generating 100x100m grid cells for the study area...")
    rows = int((STUDY_AREA["lat_max"] - STUDY_AREA["lat_min"]) / GRID_SIZE_DEG) + 1
    cols = int((STUDY_AREA["lon_max"] - STUDY_AREA["lon_min"]) / GRID_SIZE_DEG) + 1
    
    # We only care about grids that actually intersect with roads, 
    # but creating a spatial index for roads first makes this much faster
    
    # Create spatial index for fast intersection
    sindex = roads_gdf.sindex
    
    grid_data = []
    print(f"Processing grids (Total possible rows: {rows}, cols: {cols})")
    
    # We use a projected CRS (EPSG:32647 - UTM Zone 47N for Thailand) to calculate length in meters/km
    roads_gdf_proj = roads_gdf.to_crs(epsg=32647)
    
    count = 0
    for r in range(rows):
        for c in range(cols):
            lon_min, lat_min, lon_max, lat_max = get_grid_bounds(r, c)
            grid_box = box(lon_min, lat_min, lon_max, lat_max)
            
            # Find candidate roads
            possible_matches_index = list(sindex.intersection(grid_box.bounds))
            possible_matches = roads_gdf.iloc[possible_matches_index]
            
            if not possible_matches.empty:
                # Precise intersection
                exact_matches = possible_matches[possible_matches.intersects(grid_box)]
                if not exact_matches.empty:
                    # Create GeoDataFrame for the grid cell to project it
                    grid_gdf = gpd.GeoDataFrame(geometry=[grid_box], crs="EPSG:4326").to_crs(epsg=32647)
                    grid_poly = grid_gdf.geometry.iloc[0]
                    
                    # Intersect roads with grid cell boundary and calculate length
                    total_length_m = 0
                    for idx, road in exact_matches.iterrows():
                        road_proj = roads_gdf_proj.loc[idx].geometry
                        intersection = road_proj.intersection(grid_poly)
                        total_length_m += intersection.length
                    
                    if total_length_m > 0:
                        grid_data.append({
                            "grid_key": f"{r}_{c}",
                            "road_length_km": total_length_m / 1000.0
                        })
                        
            count += 1
            if count % 10000 == 0:
                print(f"Processed {count} grids...")

    if not grid_data:
        print("No roads found in the entire grid! Output not written.")
        return

    print(f"Found {len(grid_data)} grids containing roads.")
    output_df = pd.DataFrame(grid_data)
    output_df.to_parquet(output_parquet)
    print(f"Successfully saved cache to {output_parquet}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", default="cached_driving_network.parquet", help="Path to input OSM network parquet")
    parser.add_argument("--output", default="cached_grid_road_length.parquet", help="Path to output grid lengths parquet")
    args = parser.parse_args()
    build_road_length_cache(args.input, args.output)
