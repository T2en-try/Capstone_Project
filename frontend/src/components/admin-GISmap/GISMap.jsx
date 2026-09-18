import { useMemo, useState, useEffect } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import {
    ExpandOutlined,
    CompressOutlined,
    SlidersOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";

import MarkerLayer from "./MarkerLayer";
import RoadLayer from "./RoadLayer";
import HeatmapLayer from "./HeatmapLayer";
import GridLayer from "./GridLayer";
import SegmentLayer from "./SegmentLayer";
import DSSWeightSettingsDrawer from "./DSSWeightSettingsDrawer";
import { DEFAULT_DSS_WEIGHTS } from "./dssConfig";

import "leaflet/dist/leaflet.css";

export default function GISMap({
    setSelectedRoad,
    layers = {},
    filters = {},
    gridDays = 7,
    mapPoints = [],
    segmentData = [],
    centerToGrid = null,
}) {
    // ========================================
    // Fullscreen State
    // ========================================
    const [isFullscreen, setIsFullscreen] =
        useState(false);

    // ========================================
    // DSS (Decision Support System) State
    // ========================================
    const [dssOpen, setDssOpen] = useState(false);
    const [dssWeights, setDssWeights] = useState(() => {
        try {
            const saved = localStorage.getItem("casp_dss_weights");
            return saved ? JSON.parse(saved) : DEFAULT_DSS_WEIGHTS;
        } catch {
            return DEFAULT_DSS_WEIGHTS;
        }
    });

    useEffect(() => {
        localStorage.setItem("casp_dss_weights", JSON.stringify(dssWeights));
    }, [dssWeights]);

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
                    : "clamp(400px, 60vh, 780px)",

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
                DSS Decision Support Button
            ======================================== */}
            <Tooltip
                title="ระบบสนับสนุนการตัดสินใจ (DSS) — ปรับค่าน้ำหนักนโยบาย"
                placement="left"
                trigger={['hover', 'click']}
            >
                <button
                    type="button"
                    onClick={() => setDssOpen(true)}
                    style={{
                        position: "absolute",
                        top: 14,
                        right: 60,
                        zIndex: 1000,
                        padding: "0 10px",
                        height: 38,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        border: "1px solid #2563EB",
                        borderRadius: 7,
                        background: "#2563EB",
                        color: "#FFFFFF",
                        cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(37,99,235,0.3)",
                        fontSize: 13,
                        fontWeight: 600,
                        transition: "all 0.2s ease",
                    }}
                >
                    <SlidersOutlined style={{ fontSize: 14 }} />
                    <span>DSS นโยบาย</span>
                </button>
            </Tooltip>

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
                center={centerToGrid ? [centerToGrid.lat_center, centerToGrid.lon_center] : [14.8781, 102.0156]}
                zoom={centerToGrid ? 16 : 13}
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
                    CASP Grid Priority (4-Factor CUS + DSS)
                ======================================== */}
                {layers.grid && (
                    <GridLayer
                        visible={true}
                        days={gridDays}
                        weights={dssWeights}
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

            {/* ========================================
                DSS Weight Settings Drawer
            ======================================== */}
            <DSSWeightSettingsDrawer
                open={dssOpen}
                onClose={() => setDssOpen(false)}
                currentWeights={dssWeights}
                onApplyWeights={(newWeights) =>
                    setDssWeights(newWeights)
                }
            />
        </div>
    );
}