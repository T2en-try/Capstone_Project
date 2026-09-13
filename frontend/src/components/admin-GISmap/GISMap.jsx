import { useMemo, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import {
    ExpandOutlined,
    CompressOutlined,
} from "@ant-design/icons";

import MarkerLayer from "./MarkerLayer";
import RoadLayer from "./RoadLayer";
import HeatmapLayer from "./HeatmapLayer";
import GridLayer from "./GridLayer";
import SegmentLayer from "./SegmentLayer";

import "leaflet/dist/leaflet.css";

export default function GISMap({
    setSelectedRoad,
    layers = {},
    filters = {},
    gridDays = 7,
    mapPoints = [],
    segmentData = [],
}) {
    // ========================================
    // Fullscreen State
    // ========================================
    const [isFullscreen, setIsFullscreen] =
        useState(false);

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
                // Priority
                //
                // 3 = Critical
                // 2 = High
                // 1 = Low
                // ========================================
                priority_class:
                    point.priority_class,

                // ========================================
                // Severity / Priority fallback
                // ========================================
                severity:
                    point.damage_level === "critical"
                        ? "Critical"
                        : point.damage_level === "warning"
                        ? "High"
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
            filters?.keyword
                ?.trim()
                .toLowerCase() || "";

        return reports.filter((item) => {
            // ----------------------------------------
            // Keyword
            // ----------------------------------------
            const roadName =
                item.roadName?.toLowerCase() || "";

            const keywordMatch =
                !keyword ||
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

    // ========================================
    // Toggle Fullscreen
    // ========================================
    const toggleFullscreen = () => {
        setIsFullscreen((prev) => !prev);
    };

    return (
        <div
            style={{
                position: isFullscreen
                    ? "fixed"
                    : "relative",

                top: isFullscreen ? 0 : "auto",
                left: isFullscreen ? 0 : "auto",
                right: isFullscreen ? 0 : "auto",
                bottom: isFullscreen ? 0 : "auto",

                width: "100%",

                height: isFullscreen
                    ? "100vh"
                    : "780px",

                zIndex: isFullscreen
                    ? 9999
                    : 1,

                background: "#FFFFFF",

                borderRadius: isFullscreen
                    ? 0
                    : 10,

                overflow: "hidden",

                border: isFullscreen
                    ? "none"
                    : "1px solid #E5E7EB",

                boxShadow: isFullscreen
                    ? "none"
                    : "0 1px 3px rgba(15, 23, 42, 0.08)",
            }}
        >
            {/* ========================================
                Fullscreen Button
            ======================================== */}
            <button
                type="button"
                onClick={toggleFullscreen}
                title={
                    isFullscreen
                        ? "ออกจากเต็มจอ"
                        : "ดูแผนที่เต็มจอ"
                }
                style={{
                    position: "absolute",

                    top: 14,
                    right: 14,

                    zIndex: 1000,

                    width: 38,
                    height: 38,

                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",

                    border: "1px solid #D9DDE3",
                    borderRadius: 7,

                    background:
                        "rgba(255,255,255,0.96)",

                    color: "#1F2937",

                    cursor: "pointer",

                    boxShadow:
                        "0 2px 6px rgba(15,23,42,0.15)",

                    fontSize: 17,
                }}
            >
                {isFullscreen ? (
                    <CompressOutlined />
                ) : (
                    <ExpandOutlined />
                )}
            </button>

            {/* ========================================
                Map
            ======================================== */}
            <MapContainer
                center={[14.8781, 102.0156]}
                zoom={13}
                scrollWheelZoom={true}
                style={{
                    height: "100%",
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
                ======================================== */}
                {layers.grid && (
                    <GridLayer
                        visible={true}
                        days={gridDays}
                    />
                )}

                {/* ========================================
                    Road Segment Priority
                ======================================== */}
                {layers.segment && (
                    <SegmentLayer
                        reports={filteredReports}
                        segments={segmentData}
                    />
                )}

                {/* ========================================
                    Road Layer
                ======================================== */}
                {layers.road && (
                    <RoadLayer
                        reports={filteredReports}
                        onSelectRoad={
                            setSelectedRoad
                        }
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
                        onSelectRoad={
                            setSelectedRoad
                        }
                    />
                )}
            </MapContainer>
        </div>
    );
}