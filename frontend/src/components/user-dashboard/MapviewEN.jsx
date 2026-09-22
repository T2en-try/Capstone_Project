import React, { useEffect, useMemo, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Circle,
    useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

// =====================================================
// Map Controller
// =====================================================

function MapController({ points, userLocation, nearbyMode }) {
    const map = useMap();

    useEffect(() => {
        const resizeTimer = setTimeout(() => {
            map.invalidateSize();
        }, 300);

        if (userLocation && nearbyMode) {
            map.setView(
                [userLocation.latitude, userLocation.longitude],
                13,
                { animate: true }
            );

            return () => clearTimeout(resizeTimer);
        }

        if (!points || points.length === 0) {
            return () => clearTimeout(resizeTimer);
        }

        const validPoints = points.filter(
            (point) =>
                Number.isFinite(Number(point.latitude)) &&
                Number.isFinite(Number(point.longitude))
        );

        if (validPoints.length === 1) {
            map.setView(
                [
                    Number(validPoints[0].latitude),
                    Number(validPoints[0].longitude),
                ],
                16
            );
        }

        if (validPoints.length > 1) {
            const bounds = L.latLngBounds(
                validPoints.map((point) => [
                    Number(point.latitude),
                    Number(point.longitude),
                ])
            );

            map.fitBounds(bounds, {
                padding: [70, 70],
                maxZoom: 16,
            });
        }

        return () => clearTimeout(resizeTimer);
    }, [map, points, userLocation, nearbyMode]);

    return null;
}

// =====================================================
// Heatmap Layer
// =====================================================

function HeatmapLayer({ points }) {
    const map = useMap();

    useEffect(() => {
        if (!map || !points || points.length === 0) {
            return undefined;
        }

        if (typeof L.heatLayer !== "function") {
            console.error(
                "L.heatLayer is not available. Please install leaflet.heat."
            );

            return undefined;
        }

        const heatPoints = points
            .filter(
                (point) =>
                    Number.isFinite(Number(point.latitude)) &&
                    Number.isFinite(Number(point.longitude))
            )
            .map((point) => {
                const damageLevel = String(
                    point.damage_level ||
                        point.damageLevel ||
                        point.severity ||
                        "unknown"
                ).toLowerCase();

                const intensityMap = {
                    critical: 1.0,
                    warning: 0.85,
                    moderate: 0.85,
                    good: 0.45,
                    low: 0.45,
                    unknown: 0.55,
                };

                const intensity = intensityMap[damageLevel] ?? 0.55;

                return [
                    Number(point.latitude),
                    Number(point.longitude),
                    intensity,
                ];
            });

        if (heatPoints.length === 0) {
            return undefined;
        }

        const heatLayer = L.heatLayer(heatPoints, {
            radius: 42,
            blur: 28,
            maxZoom: 18,
            minOpacity: 0.45,
            max: 1.0,
            gradient: {
                0.0: "#22c55e",
                0.2: "#84cc16",
                0.4: "#facc15",
                0.6: "#fb923c",
                0.8: "#f97316",
                1.0: "#ef4444",
            },
        });

        heatLayer.addTo(map);

        return () => {
            if (map.hasLayer(heatLayer)) {
                map.removeLayer(heatLayer);
            }
        };
    }, [map, points]);

    return null;
}

// =====================================================
// User Location Icon
// =====================================================

const userLocationIcon = new L.DivIcon({
    html: `
        <div style="
            position:relative;
            width:42px;
            height:42px;
            display:flex;
            align-items:center;
            justify-content:center;
        ">
            <div style="
                position:absolute;
                width:42px;
                height:42px;
                border-radius:50%;
                background:rgba(59,130,246,0.20);
                animation:pulse-location 2s infinite;
            "></div>

            <div style="
                position:relative;
                width:18px;
                height:18px;
                border-radius:50%;
                background:#2563eb;
                border:4px solid white;
                box-shadow:0 2px 8px rgba(0,0,0,.35);
            "></div>
        </div>

        <style>
            @keyframes pulse-location {
                0% {
                    transform:scale(.8);
                    opacity:.8;
                }

                70% {
                    transform:scale(1.5);
                    opacity:0;
                }

                100% {
                    transform:scale(.8);
                    opacity:0;
                }
            }
        </style>
    `,
    className: "",
    iconSize: [42, 42],
    iconAnchor: [21, 21],
});

// =====================================================
// Cluster Icon
// =====================================================

function createClusterIcon(cluster) {
    const count = cluster.getChildCount();

    let size = 38;

    if (count >= 20) {
        size = 56;
    } else if (count >= 10) {
        size = 48;
    } else if (count >= 5) {
        size = 42;
    }

    return L.divIcon({
        html: `
            <div style="
                display:flex;
                align-items:center;
                justify-content:center;
                width:${size}px;
                height:${size}px;
                border-radius:50%;
                background:#1e293b;
                border:4px solid rgba(255,255,255,0.95);
                box-shadow:0 4px 14px rgba(15,23,42,0.30);
                color:white;
                font-size:13px;
                font-weight:700;
            ">
                ${count}
            </div>
        `,
        className: "",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

// =====================================================
// Marker Icon
// =====================================================

const createIcon = (color) =>
    new L.DivIcon({
        html: `
            <div style="
                width:20px;
                height:20px;
                background:${color};
                border-radius:50%;
                border:3px solid white;
                box-shadow:0 2px 8px rgba(15,23,42,0.35);
            "></div>
        `,
        className: "",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10],
    });

// =====================================================
// Status
// =====================================================

const getStatusInfo = (status) => {
    const statusMap = {
        pending: {
            label: "Pending",
            bg: "bg-red-50",
            text: "text-red-600",
            dot: "bg-red-500",
        },

        processing: {
            label: "In Progress",
            bg: "bg-orange-50",
            text: "text-orange-600",
            dot: "bg-orange-500",
        },

        working: {
            label: "In Progress",
            bg: "bg-orange-50",
            text: "text-orange-600",
            dot: "bg-orange-500",
        },

        forward: {
            label: "Forwarded",
            bg: "bg-blue-50",
            text: "text-blue-600",
            dot: "bg-blue-500",
        },

        completed: {
            label: "Completed",
            bg: "bg-emerald-50",
            text: "text-emerald-600",
            dot: "bg-emerald-500",
        },

        rejected: {
            label: "Rejected",
            bg: "bg-slate-100",
            text: "text-slate-500",
            dot: "bg-slate-400",
        },
    };

    return (
        statusMap[status] || {
            label: status || "Unknown",
            bg: "bg-slate-100",
            text: "text-slate-500",
            dot: "bg-slate-400",
        }
    );
};

// =====================================================
// Damage
// =====================================================

const getDamageInfo = (damageLevel) => {
    const damageMap = {
        critical: {
            label: "Critical",
            color: "#ef4444",
            bg: "bg-red-50",
            text: "text-red-600",
        },

        warning: {
            label: "Warning",
            color: "#f97316",
            bg: "bg-orange-50",
            text: "text-orange-600",
        },

        moderate: {
            label: "Moderate",
            color: "#eab308",
            bg: "bg-yellow-50",
            text: "text-yellow-600",
        },

        good: {
            label: "Good",
            color: "#22c55e",
            bg: "bg-green-50",
            text: "text-green-600",
        },

        low: {
            label: "Low",
            color: "#22c55e",
            bg: "bg-green-50",
            text: "text-green-600",
        },

        unknown: {
            label: "Unknown",
            color: "#94a3b8",
            bg: "bg-slate-100",
            text: "text-slate-500",
        },
    };

    return (
        damageMap[String(damageLevel || "unknown").toLowerCase()] ||
        damageMap.unknown
    );
};

// =====================================================
// Distance Calculation
// =====================================================

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// =====================================================
// Format Distance
// =====================================================

function formatDistance(distanceKm) {
    if (
        distanceKm === null ||
        distanceKm === undefined ||
        !Number.isFinite(distanceKm)
    ) {
        return "Distance unavailable";
    }

    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`;
    }

    return `${distanceKm.toFixed(2)} km`;
}

// =====================================================
// Report Popup
// =====================================================

function ReportPopup({ point, onMarkerClick, userLocation }) {
    const status = getStatusInfo(point.status);
    const damage = getDamageInfo(point.damage_level);

    let distance = null;

    if (userLocation) {
        distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            Number(point.latitude),
            Number(point.longitude)
        );
    }

    return (
        <div className="w-[270px] p-1 font-sans text-slate-700">
            {/* Header */}

            <div className="border-b border-slate-100 pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Road Report
                        </p>

                        <h3 className="mt-0.5 text-base font-bold text-slate-900">
                            Report #{point.id}
                        </h3>
                    </div>

                    <div
                        className={`
                            rounded-full
                            px-2.5
                            py-1
                            text-[10px]
                            font-semibold
                            ${status.bg}
                            ${status.text}
                        `}
                    >
                        {status.label}
                    </div>
                </div>

                {point.road_name && (
                    <div className="mt-2 rounded-lg bg-blue-50 px-2.5 py-2">
                        <p className="text-xs font-semibold text-blue-700">
                            📍 {point.road_name}
                        </p>
                    </div>
                )}
            </div>

            {/* Information */}

            <div className="space-y-2.5 py-3">
                {/* Damage */}

                <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-400">
                        Damage Level
                    </span>

                    <span
                        className={`
                            flex
                            items-center
                            gap-1.5
                            rounded-full
                            px-2
                            py-1
                            text-[10px]
                            font-semibold
                            ${damage.bg}
                            ${damage.text}
                        `}
                    >
                        <span
                            className="h-2 w-2 rounded-full"
                            style={{
                                backgroundColor: damage.color,
                            }}
                        />

                        {damage.label}
                    </span>
                </div>

                {/* Reporter */}

                {point.reporter_name && (
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-slate-400">
                            Reporter
                        </span>

                        <span className="max-w-[140px] truncate text-xs font-medium text-slate-700">
                            {point.reporter_name}
                        </span>
                    </div>
                )}

                {/* Distance */}

                {distance !== null && (
                    <div
                        className="
                            flex
                            items-center
                            justify-between
                            rounded-lg
                            bg-blue-50
                            px-3
                            py-2
                        "
                    >
                        <span className="text-xs text-blue-500">
                            📍 Distance from you
                        </span>

                        <span className="text-xs font-bold text-blue-700">
                            {formatDistance(distance)}
                        </span>
                    </div>
                )}
            </div>

            {/* Coordinates */}

            <div className="rounded-xl bg-slate-50 p-3">
                <p className="mb-2 text-[10px] font-semibold text-slate-500">
                    Location Coordinates
                </p>

                <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Latitude</span>

                    <span className="font-medium text-slate-600">
                        {Number(point.latitude).toFixed(6)}
                    </span>
                </div>

                <div className="mt-1.5 flex justify-between text-[10px]">
                    <span className="text-slate-400">Longitude</span>

                    <span className="font-medium text-slate-600">
                        {Number(point.longitude).toFixed(6)}
                    </span>
                </div>
            </div>

            {/* Date */}

            {point.created_at && (
                <p className="mt-3 text-right text-[10px] text-slate-400">
                    {new Date(point.created_at).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </p>
            )}

            {/* Button */}

            {onMarkerClick && (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onMarkerClick(point.id);
                    }}
                    className="
                        mt-3
                        w-full
                        rounded-xl
                        bg-slate-800
                        px-3
                        py-2.5
                        text-xs
                        font-semibold
                        text-white
                        transition
                        hover:bg-slate-700
                    "
                >
                    View Report Details
                </button>
            )}
        </div>
    );
}

// =====================================================
// Main MapView
// =====================================================

export default function MapView({
    mapPoints = [],
    loading = false,
    onMarkerClick,
    isFiltered = false,
}) {
    const [mapMode, setMapMode] = useState("heatmap");

    const [nearbyMode, setNearbyMode] = useState(false);

    const [userLocation, setUserLocation] = useState(null);

    const [locationLoading, setLocationLoading] = useState(false);

    const [locationError, setLocationError] = useState("");

    const [nearbyRadius, setNearbyRadius] = useState(5);

    const defaultCenter = [14.9799, 102.0977];

    const defaultZoom = 14;

    // ===================================================
    // Valid Points
    // ===================================================

    const validMapPoints = useMemo(() => {
        return mapPoints.filter(
            (point) =>
                Number.isFinite(Number(point.latitude)) &&
                Number.isFinite(Number(point.longitude))
        );
    }, [mapPoints]);

    // ===================================================
    // Nearby Points
    // ===================================================

    const nearbyPoints = useMemo(() => {
        if (!nearbyMode || !userLocation) {
            return validMapPoints;
        }

        return validMapPoints
            .map((point) => {
                const distance = calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    Number(point.latitude),
                    Number(point.longitude)
                );

                return {
                    ...point,
                    distanceFromUser: distance,
                };
            })
            .filter(
                (point) => point.distanceFromUser <= nearbyRadius
            )
            .sort(
                (a, b) =>
                    a.distanceFromUser - b.distanceFromUser
            );
    }, [
        validMapPoints,
        nearbyMode,
        userLocation,
        nearbyRadius,
    ]);

    const displayPoints = nearbyMode
        ? nearbyPoints
        : validMapPoints;

    // ===================================================
    // Icons
    // ===================================================

    const icons = {
        critical: createIcon("#ef4444"),
        warning: createIcon("#f97316"),
        moderate: createIcon("#f97316"),
        good: createIcon("#22c55e"),
        low: createIcon("#22c55e"),
        unknown: createIcon("#94a3b8"),
    };

    // ===================================================
    // Map Modes
    // ===================================================

    const mapModes = [
        {
            value: "heatmap",
            label: "Heatmap",
        },
        {
            value: "cluster",
            label: "Cluster",
        },
        {
            value: "marker",
            label: "Markers",
        },
    ];

    // ===================================================
    // Find My Location
    // ===================================================

    const handleFindNearby = () => {
        if (!navigator.geolocation) {
            setLocationError(
                "This browser does not support location services."
            );

            return;
        }

        setLocationLoading(true);
        setLocationError("");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                };

                setUserLocation(location);
                setNearbyMode(true);
                setLocationLoading(false);
            },

            (error) => {
                console.error("Geolocation error:", error);

                setLocationLoading(false);

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setLocationError(
                            "Please allow this website to access your location."
                        );
                        break;

                    case error.POSITION_UNAVAILABLE:
                        setLocationError(
                            "Your location could not be determined."
                        );
                        break;

                    case error.TIMEOUT:
                        setLocationError(
                            "Location search timed out."
                        );
                        break;

                    default:
                        setLocationError(
                            "Unable to determine your location."
                        );
                }
            },

            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000,
            }
        );
    };

    // ===================================================
    // Clear Nearby
    // ===================================================

    const handleClearNearby = () => {
        setNearbyMode(false);
        setUserLocation(null);
        setLocationError("");
    };

    // ===================================================
    // Render
    // ===================================================

    return (
        <div
            className="
                relative
                h-full
                w-full
                overflow-hidden
                rounded-2xl
                border
                border-slate-200
                bg-slate-100
                shadow-sm
            "
        >
            {/* Loading */}

            {loading && (
                <div
                    className="
                        absolute
                        inset-0
                        z-[3000]
                        flex
                        items-center
                        justify-center
                        bg-white/70
                        backdrop-blur-sm
                    "
                >
                    <div
                        className="
                            rounded-2xl
                            border
                            border-slate-200
                            bg-white
                            px-6
                            py-5
                            text-center
                            shadow-xl
                        "
                    >
                        <div
                            className="
                                mx-auto
                                h-9
                                w-9
                                animate-spin
                                rounded-full
                                border-4
                                border-slate-200
                                border-t-mark
                            "
                        />

                        <p className="mt-3 text-sm font-semibold text-slate-700">
                            Loading map data
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                            Please wait...
                        </p>
                    </div>
                </div>
            )}

            {/* Map */}

            <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                className="h-full w-full"
                zoomControl={false}
            >
                <MapController
                    points={displayPoints}
                    userLocation={userLocation}
                    nearbyMode={nearbyMode}
                />

                {mapMode === "heatmap" && (
                    <HeatmapLayer points={displayPoints} />
                )}

                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* User Location */}

                {userLocation && (
                    <>
                        {nearbyMode && (
                            <Circle
                                center={[
                                    userLocation.latitude,
                                    userLocation.longitude,
                                ]}
                                radius={nearbyRadius * 1000}
                                pathOptions={{
                                    color: "#2563eb",
                                    fillColor: "#3b82f6",
                                    fillOpacity: 0.08,
                                    weight: 2,
                                }}
                            />
                        )}

                        <Marker
                            position={[
                                userLocation.latitude,
                                userLocation.longitude,
                            ]}
                            icon={userLocationIcon}
                        >
                            <Popup>
                                <div className="p-1">
                                    <p className="text-sm font-bold text-slate-800">
                                        📍 Your Location
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        Latitude:{" "}
                                        {userLocation.latitude.toFixed(6)}
                                    </p>

                                    <p className="text-xs text-slate-500">
                                        Longitude:{" "}
                                        {userLocation.longitude.toFixed(6)}
                                    </p>

                                    {nearbyMode && (
                                        <div className="mt-2 rounded-lg bg-blue-50 px-2 py-1.5">
                                            <p className="text-[10px] font-semibold text-blue-600">
                                                🔵 Search Radius
                                            </p>

                                            <p className="text-xs font-bold text-blue-700">
                                                {nearbyRadius} km
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    </>
                )}

                {/* Cluster */}

                {mapMode === "cluster" && (
                    <MarkerClusterGroup
                        chunkedLoading
                        disableClusteringAtZoom={16}
                        maxClusterRadius={60}
                        iconCreateFunction={createClusterIcon}
                    >
                        {displayPoints.map((point) => {
                            const damageLevel = String(
                                point.damage_level || "unknown"
                            ).toLowerCase();

                            return (
                                <Marker
                                    key={point.id}
                                    position={[
                                        Number(point.latitude),
                                        Number(point.longitude),
                                    ]}
                                    icon={
                                        icons[damageLevel] ||
                                        icons.unknown
                                    }
                                    eventHandlers={{
                                        click: () => {
                                            if (onMarkerClick) {
                                                onMarkerClick(point.id);
                                            }
                                        },
                                    }}
                                >
                                    <Popup>
                                        <ReportPopup
                                            point={point}
                                            onMarkerClick={onMarkerClick}
                                            userLocation={userLocation}
                                        />
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MarkerClusterGroup>
                )}

                {/* Marker */}

                {mapMode === "marker" &&
                    displayPoints.map((point) => {
                        const damageLevel = String(
                            point.damage_level || "unknown"
                        ).toLowerCase();

                        return (
                            <Marker
                                key={point.id}
                                position={[
                                    Number(point.latitude),
                                    Number(point.longitude),
                                ]}
                                icon={
                                    icons[damageLevel] ||
                                    icons.unknown
                                }
                                eventHandlers={{
                                    click: () => {
                                        if (onMarkerClick) {
                                            onMarkerClick(point.id);
                                        }
                                    },
                                }}
                            >
                                <Popup>
                                    <ReportPopup
                                        point={point}
                                        onMarkerClick={onMarkerClick}
                                        userLocation={userLocation}
                                    />
                                </Popup>
                            </Marker>
                        );
                    })}
            </MapContainer>

            {/* =================================================
                Top Left Controls
            ================================================= */}

            <div
                className="
                    absolute
                    left-4
                    top-4
                    z-[1000]
                    flex
                    flex-col
                    gap-2
                "
            >
                {/* Map Modes */}

                <div
                    className="
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white/95
                        p-1.5
                        shadow-lg
                        backdrop-blur
                    "
                >
                    <div className="flex items-center gap-1">
                        {mapModes.map((mode) => {
                            const active =
                                mapMode === mode.value;

                            return (
                                <button
                                    key={mode.value}
                                    type="button"
                                    onClick={() =>
                                        setMapMode(mode.value)
                                    }
                                    className={`
                                        rounded-xl
                                        px-3
                                        py-2
                                        text-xs
                                        font-semibold
                                        transition
                                        ${
                                            active
                                                ? "bg-mark text-paper shadow-sm"
                                                : "text-slate-500 hover:bg-slate-100"
                                        }
                                    `}
                                >
                                    {mode.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Nearby Button */}

                <button
                    type="button"
                    onClick={
                        nearbyMode
                            ? handleClearNearby
                            : handleFindNearby
                    }
                    disabled={locationLoading}
                    className={`
                        group
                        flex
                        w-full
                        items-center
                        justify-center
                        gap-2.5
                        rounded-xl
                        px-4
                        py-2.5
                        text-xs
                        font-semibold
                        transition-all
                        duration-200
                        ${
                            nearbyMode
                                ? "bg-mark text-paper shadow-sm hover:opacity-90"
                                : "bg-slate-800 text-white shadow-sm hover:bg-slate-700"
                        }
                        ${
                            locationLoading
                                ? "cursor-wait opacity-70"
                                : "active:scale-[0.98]"
                        }
                    `}
                >
                    {locationLoading ? (
                        <>
                            <span
                                className="
                                    h-3.5
                                    w-3.5
                                    animate-spin
                                    rounded-full
                                    border-2
                                    border-white/30
                                    border-t-white
                                "
                            />

                            <span>
                                Finding your location...
                            </span>
                        </>
                    ) : nearbyMode ? (
                        <span>Show All Reports</span>
                    ) : (
                        <span>Problems Near Me</span>
                    )}
                </button>
            </div>

            {/* =================================================
                Nearby Radius Selector
            ================================================= */}

            {nearbyMode && (
                <div
                    className="
                        absolute
                        left-4
                        top-[126px]
                        z-[1000]
                        rounded-2xl
                        border
                        border-blue-100
                        bg-white/95
                        px-4
                        py-3
                        shadow-lg
                        backdrop-blur
                    "
                >
                    <p className="text-[10px] font-semibold text-slate-400">
                        Search within
                    </p>

                    <div className="mt-1 flex items-center gap-2">
                        <select
                            value={nearbyRadius}
                            onChange={(event) =>
                                setNearbyRadius(
                                    Number(event.target.value)
                                )
                            }
                            className="
                                rounded-lg
                                border
                                border-slate-200
                                bg-white
                                px-2
                                py-1.5
                                text-xs
                                font-semibold
                                text-slate-700
                                outline-none
                                focus:border-blue-400
                            "
                        >
                            <option value={1}>1 km</option>
                            <option value={2}>2 km</option>
                            <option value={5}>5 km</option>
                            <option value={10}>10 km</option>
                            <option value={20}>20 km</option>
                        </select>

                        <span className="text-[10px] text-slate-400">
                            from your location
                        </span>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full border-2 border-blue-500 bg-blue-100" />

                        <span className="text-[10px] text-blue-600">
                            Blue circle = search radius
                        </span>
                    </div>
                </div>
            )}

            {/* =================================================
                Location Error
            ================================================= */}

            {locationError && (
                <div
                    className="
                        absolute
                        left-1/2
                        top-4
                        z-[2000]
                        -translate-x-1/2
                        rounded-xl
                        border
                        border-red-200
                        bg-white
                        px-4
                        py-3
                        shadow-xl
                    "
                >
                    <div className="flex items-center gap-2">
                        <div>
                            <p className="text-xs font-bold text-red-600">
                                Unable to determine location
                            </p>

                            <p className="mt-0.5 text-[10px] text-slate-500">
                                {locationError}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================
                Count
            ================================================= */}

            {!loading && (
                <div
                    className="
                        absolute
                        right-4
                        top-4
                        z-[1000]
                        flex
                        items-center
                        gap-2
                        rounded-full
                        border
                        border-slate-200
                        bg-white/95
                        px-4
                        py-2
                        shadow-lg
                        backdrop-blur
                    "
                >
                    <span
                        className={`
                            h-2.5
                            w-2.5
                            rounded-full
                            ${
                                nearbyMode
                                    ? "bg-blue-500"
                                    : "bg-emerald-500"
                            }
                        `}
                    />

                    <span className="text-xs font-bold text-slate-700">
                        {nearbyMode
                            ? `${displayPoints.length} reports nearby`
                            : `${displayPoints.length} reports`}
                    </span>
                </div>
            )}

            {/* =================================================
                Nearby Active Banner
            ================================================= */}

            {nearbyMode && !locationError && (
                <div
                    className="
                        absolute
                        bottom-5
                        left-1/2
                        z-[1000]
                        -translate-x-1/2
                        rounded-full
                        border
                        border-blue-100
                        bg-white/95
                        px-4
                        py-2.5
                        shadow-lg
                        backdrop-blur
                    "
                >
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-blue-500" />

                        <span className="text-xs font-semibold text-slate-700">
                            Showing problems within{" "}
                            {nearbyRadius} km
                        </span>
                    </div>
                </div>
            )}

            {/* =================================================
                Empty
            ================================================= */}

            {!loading && displayPoints.length === 0 && (
                <div
                    className="
                        absolute
                        left-1/2
                        top-1/2
                        z-[1000]
                        -translate-x-1/2
                        -translate-y-1/2
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white/95
                        px-7
                        py-6
                        text-center
                        shadow-xl
                        backdrop-blur
                    "
                >
                    <div className="text-3xl">
                        {nearbyMode ? "🎉" : "📍"}
                    </div>

                    <p className="mt-2 text-sm font-bold text-slate-700">
                        {nearbyMode
                            ? `No problems found within ${nearbyRadius} km`
                            : isFiltered
                            ? "No reports match your filters"
                            : "No report data available"}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                        {nearbyMode
                            ? "Try increasing the search radius."
                            : "Reports with valid coordinates will appear on the map."}
                    </p>
                </div>
            )}
        </div>
    );
}