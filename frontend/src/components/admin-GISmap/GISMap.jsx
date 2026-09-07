import { useMemo } from "react";
import { MapContainer, TileLayer } from "react-leaflet";

import MarkerLayer from "./MarkerLayer";
import RoadLayer from "./RoadLayer";
import HeatmapLayer from "./HeatmapLayer";
import GridLayer from "./GridLayer";

import "leaflet/dist/leaflet.css";

export default function GISMap({
    setSelectedRoad,
    layers = {},
    filters = {},
    gridDays = 7,
    mapPoints = [],
}) {
    // ========================================
    // Transform API data → Map data
    // ========================================
    const reports = useMemo(() => {
        const points = Array.isArray(mapPoints)
            ? mapPoints
            : [];

        return points
            .filter(
                (point) =>
                    point.latitude != null &&
                    point.longitude != null
            )
            .map((point) => ({
                ...point,

                // ========================================
                // Coordinates
                // ========================================
                lat: Number(point.latitude),
                lng: Number(point.longitude),

                // ========================================
                // Road Name
                // ========================================
                roadName:
                    point.road_name ||
                    `Report #${point.id}`,

                // ========================================
                // Backend damage_level
                // → Frontend severity
                // ========================================
                severity:
                    point.damage_level === "critical"
                        ? "Critical"
                        : point.damage_level === "warning"
                        ? "High"
                        : point.damage_level === "moderate"
                        ? "Medium"
                        : point.damage_level === "good"
                        ? "Low"
                        : "Low",

                // ========================================
                // Status
                // ========================================
                status: point.status
                    ? point.status.charAt(0).toUpperCase() +
                      point.status.slice(1)
                    : "Unknown",

                // ========================================
                // Description
                // ========================================
                description:
                    point.decision ||
                    "ไม่มีรายละเอียดความเสียหาย",
            }));
    }, [mapPoints]);

    // ========================================
    // Filter reports
    // ========================================
    const filteredReports = useMemo(() => {
        const keyword =
            filters?.keyword?.trim().toLowerCase() || "";

        return reports.filter((item) => {
            // ----------------------------------------
            // Keyword
            // ----------------------------------------
            const roadName =
                item.roadName?.toLowerCase() || "";

            const keywordMatch =
                roadName.includes(keyword);

            // ----------------------------------------
            // Severity
            // ----------------------------------------
            const severityMatch =
                filters?.severity === "All" ||
                !filters?.severity ||
                item.severity === filters.severity;

            // ----------------------------------------
            // Status
            // ----------------------------------------
            const statusMatch =
                filters?.status === "All" ||
                !filters?.status ||
                item.status === filters.status;

            return (
                keywordMatch &&
                severityMatch &&
                statusMatch
            );
        });
    }, [filters, reports]);

    return (
        <MapContainer
            center={[14.8781, 102.0156]}
            zoom={13}
            scrollWheelZoom={true}
            style={{
                height: "650px",
                width: "100%",
            }}
        >
            {/* ========================================
                Base Map
            ======================================== */}
            <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url={
                    layers.satellite
                        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                }
            />

            {/* ========================================
                CASP Grid Priority
                Backend:
                GET /api/analytics/grid-priority?days=N
            ======================================== */}
            {layers.grid && (
                <GridLayer
                    visible={true}
                    days={gridDays}
                />
            )}

            {/* ========================================
                Road Layer
            ======================================== */}
            {layers.road && (
                <RoadLayer
                    reports={filteredReports}
                    onSelectRoad={setSelectedRoad}
                />
            )}

            {/* ========================================
                Heatmap
            ======================================== */}
            {layers.heatmap && (
                <HeatmapLayer
                    reports={filteredReports}
                />
            )}

            {/* ========================================
                Marker Layer
            ======================================== */}
            {layers.marker && (
                <MarkerLayer
                    reports={filteredReports}
                    onSelectRoad={setSelectedRoad}
                />
            )}
        </MapContainer>
    );
}