"""
Snap-to-Road Service

ใช้ OSM road cache ภายในระบบ
เพื่อปรับพิกัด GPS ของผู้ใช้ให้ตรงกับแนวถนนจริง

ไม่เรียก Google Roads API
ไม่ต้องใช้ API Key
"""

import math
from functools import lru_cache
from pathlib import Path
from typing import Any

import geopandas as gpd
from shapely.geometry import Point

from app.core.config import settings


# ============================================================
# Thresholds
# ============================================================

# ระยะจากจุด GPS ไปยังถนน
SNAP_ACCEPT_DISTANCE_M = 30.0
SNAP_WARNING_DISTANCE_M = 50.0

# GPS accuracy
GPS_GOOD_ACCURACY_M = 20.0
GPS_WARNING_ACCURACY_M = 50.0


# ============================================================
# Coordinate validation
# ============================================================

def _validate_coordinates(
    latitude: float,
    longitude: float,
) -> None:

    if not math.isfinite(latitude):
        raise ValueError(
            "Latitude must be a finite number"
        )

    if not math.isfinite(longitude):
        raise ValueError(
            "Longitude must be a finite number"
        )

    if not -90 <= latitude <= 90:
        raise ValueError(
            "Latitude must be between -90 and 90"
        )

    if not -180 <= longitude <= 180:
        raise ValueError(
            "Longitude must be between -180 and 180"
        )


# ============================================================
# GPS accuracy validation
# ============================================================

def _validate_accuracy(
    accuracy: float | None,
) -> None:

    if accuracy is None:
        return

    if not math.isfinite(accuracy):
        raise ValueError(
            "GPS accuracy must be a finite number"
        )

    if accuracy < 0:
        raise ValueError(
            "GPS accuracy must be >= 0"
        )


def _classify_gps_accuracy(
    accuracy: float | None,
) -> str:

    if accuracy is None:
        return "unknown"

    if accuracy <= GPS_GOOD_ACCURACY_M:
        return "good"

    if accuracy <= GPS_WARNING_ACCURACY_M:
        return "warning"

    return "rejected"


# ============================================================
# OSM cache path
# ============================================================

def _get_cache_path() -> Path:

    configured_path = getattr(
        settings,
        "OSM_CACHE_PATH",
        "cached_driving_network.parquet",
    )

    path = Path(configured_path)

    if not path.is_absolute():
        path = Path.cwd() / path

    return path


# ============================================================
# Load OSM road network
# ============================================================

@lru_cache(maxsize=1)
def _load_road_network() -> gpd.GeoDataFrame:

    cache_path = _get_cache_path()

    if not cache_path.exists():
        raise FileNotFoundError(
            f"OSM road cache not found: {cache_path}"
        )

    try:
        roads = gpd.read_parquet(
            cache_path
        )
    except Exception as exc:
        raise RuntimeError(
            f"Unable to read OSM road cache: {exc}"
        ) from exc

    if roads.empty:
        raise RuntimeError(
            "OSM road cache is empty"
        )

    if "geometry" not in roads.columns:
        raise RuntimeError(
            "OSM road cache does not contain geometry"
        )

    # เอา geometry ที่ใช้ไม่ได้ออก
    roads = roads[
        roads.geometry.notna()
        & ~roads.geometry.is_empty
    ].copy()

    if roads.empty:
        raise RuntimeError(
            "No valid road geometry found in OSM cache"
        )

    # Cache ควรเป็น WGS84
    if roads.crs is None:
        roads = roads.set_crs(
            "EPSG:4326"
        )
    else:
        roads = roads.to_crs(
            "EPSG:4326"
        )

    roads = roads.reset_index(
        drop=True
    )

    return roads


# ============================================================
# Metric CRS
# ============================================================

def _get_metric_crs(
    latitude: float,
    longitude: float,
) -> str:

    zone = int(
        (longitude + 180) / 6
    ) + 1

    if latitude >= 0:
        epsg = 32600 + zone
    else:
        epsg = 32700 + zone

    return f"EPSG:{epsg}"


# ============================================================
# Get first useful value
# ============================================================

def _get_first_value(
    row: Any,
    columns: list[str],
) -> Any:

    for column in columns:

        if column not in row.index:
            continue

        value = row[column]

        if value is None:
            continue

        try:
            if isinstance(
                value,
                float,
            ) and math.isnan(value):
                continue
        except (TypeError, ValueError):
            pass

        text = str(value).strip()

        if text:
            return value

    return None


# ============================================================
# Classify snap distance
# ============================================================

def _classify_distance(
    distance_meters: float,
) -> tuple[str, bool]:

    if distance_meters <= SNAP_ACCEPT_DISTANCE_M:
        return "accepted", True

    if distance_meters <= SNAP_WARNING_DISTANCE_M:
        return "warning", False

    return "rejected", False


# ============================================================
# Snap to road
# ============================================================

async def snap_to_road(
    latitude: float,
    longitude: float,
    accuracy: float | None = None,
) -> dict[str, Any]:

    # --------------------------------------------------------
    # Validate
    # --------------------------------------------------------

    _validate_coordinates(
        latitude,
        longitude,
    )

    _validate_accuracy(
        accuracy
    )

    # --------------------------------------------------------
    # GPS accuracy
    # --------------------------------------------------------

    gps_accuracy_status = (
        _classify_gps_accuracy(
            accuracy
        )
    )

    # ถ้า GPS แย่กว่า 50m
    # ไม่ควรเอาไป snap ต่อ
    if gps_accuracy_status == "rejected":

        return {
            "original": {
                "latitude": float(latitude),
                "longitude": float(longitude),
            },

            "snapped": None,

            "distance_meters": None,

            "decision": "gps_rejected",

            "accepted": False,

            "gps_accuracy": (
                float(accuracy)
                if accuracy is not None
                else None
            ),

            "gps_accuracy_status": (
                gps_accuracy_status
            ),

            "osm_way_id": None,

            "road_name": None,

            "highway": None,
        }

    # --------------------------------------------------------
    # Load roads
    # --------------------------------------------------------

    roads = _load_road_network()

    if roads.empty:
        raise RuntimeError(
            "No road data available"
        )

    # --------------------------------------------------------
    # Metric projection
    # --------------------------------------------------------

    metric_crs = _get_metric_crs(
        latitude,
        longitude,
    )

    roads_metric = roads.to_crs(
        metric_crs
    )

    point_wgs84 = Point(
        longitude,
        latitude,
    )

    point_metric = (
        gpd.GeoSeries(
            [point_wgs84],
            crs="EPSG:4326",
        )
        .to_crs(metric_crs)
        .iloc[0]
    )

    # --------------------------------------------------------
    # Find nearest road
    # --------------------------------------------------------

    point_gdf = gpd.GeoDataFrame(
        {
            "geometry": [
                point_metric
            ]
        },
        crs=metric_crs,
    )

    try:

        nearest = gpd.sjoin_nearest(
            point_gdf,
            roads_metric,
            how="left",
            distance_col="distance_meters",
        )

    except Exception as exc:

        raise RuntimeError(
            f"Unable to find nearest road: {exc}"
        ) from exc

    if nearest.empty:
        raise RuntimeError(
            "No road found near the specified location"
        )

    result = nearest.iloc[0]

    road_index = result.get(
        "index_right"
    )

    if road_index is None:
        raise RuntimeError(
            "Unable to identify nearest road"
        )

    # --------------------------------------------------------
    # Get road
    # --------------------------------------------------------

    try:
        road = roads_metric.loc[
            int(road_index)
        ]
    except Exception as exc:
        raise RuntimeError(
            "Unable to load nearest road"
        ) from exc

    road_geometry = road.geometry

    if (
        road_geometry is None
        or road_geometry.is_empty
    ):
        raise RuntimeError(
            "Nearest road has invalid geometry"
        )

    # --------------------------------------------------------
    # Calculate snapped point
    # --------------------------------------------------------

    snapped_metric = (
        road_geometry.interpolate(
            road_geometry.project(
                point_metric
            )
        )
    )

    snapped_wgs84 = (
        gpd.GeoSeries(
            [snapped_metric],
            crs=metric_crs,
        )
        .to_crs("EPSG:4326")
        .iloc[0]
    )

    # --------------------------------------------------------
    # Distance
    # --------------------------------------------------------

    distance_meters = float(
        point_metric.distance(
            snapped_metric
        )
    )

    distance_meters = round(
        distance_meters,
        2,
    )

    decision, accepted = (
        _classify_distance(
            distance_meters
        )
    )

    # --------------------------------------------------------
    # Road information
    # --------------------------------------------------------

    osm_way_id = _get_first_value(
        road,
        [
            "osm_way_id",
            "osmid",
            "way_id",
            "id",
        ],
    )

    road_name = _get_first_value(
        road,
        [
            "name",
            "road_name",
        ],
    )

    highway = _get_first_value(
        road,
        [
            "highway",
            "road_type",
        ],
    )

    # --------------------------------------------------------
    # Result
    # --------------------------------------------------------

    return {

        "original": {
            "latitude": float(
                latitude
            ),
            "longitude": float(
                longitude
            ),
        },

        "snapped": {
            "latitude": float(
                snapped_wgs84.y
            ),
            "longitude": float(
                snapped_wgs84.x
            ),
        },

        "distance_meters": (
            distance_meters
        ),

        "decision": decision,

        "accepted": accepted,

        "gps_accuracy": (
            float(accuracy)
            if accuracy is not None
            else None
        ),

        "gps_accuracy_status": (
            gps_accuracy_status
        ),

        "osm_way_id": (
            int(osm_way_id)
            if osm_way_id is not None
            else None
        ),

        "road_name": (
            str(road_name)
            if road_name is not None
            else None
        ),

        "highway": (
            str(highway)
            if highway is not None
            else None
        ),
    }