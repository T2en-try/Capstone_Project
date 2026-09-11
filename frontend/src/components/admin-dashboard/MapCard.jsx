import { useEffect, useMemo, useRef, useState } from "react";

import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap,
    ZoomControl,
    ScaleControl,
} from "react-leaflet";

import MarkerClusterGroup from "react-leaflet-cluster";

import { Button, Input, Segmented, Progress, Divider, Typography } from "antd";

import {
    SearchOutlined,
    ReloadOutlined,
    FullscreenOutlined,
    EnvironmentOutlined,
    DashboardOutlined,
    ClockCircleOutlined,
    UserOutlined,
    WarningOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
} from "@ant-design/icons";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

const { Text } = Typography;

// ============================================================
// Design System
// ============================================================

const COLORS = {
    ink: "#14352F",
    inkSoft: "#1F4A42",
    mark: "#E6A817",
    markDeep: "#C48A0A",
    mist: "#E8EFEC",
    paper: "#F7FAF8",
    asphalt: "#2A3431",
    line: "#C5D4CF",
    danger: "#C45C4A",
    ok: "#2D7A5F",
    warn: "#C4891A",
    info: "#2F6F7E",
};

// ============================================================
// Leaflet Default Marker Fix
// ============================================================

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ============================================================
// AI Priority Configuration
// ============================================================

const PRIORITY_CONFIG = {
    1: {
        key: "good",
        label: "Good",
        thaiLabel: "สภาพปกติ",
        hex: COLORS.ok,
        bg: "#E8F3EE",
        icon: <CheckCircleOutlined />,
    },

    2: {
        key: "warning",
        label: "Warning",
        thaiLabel: "ควรเฝ้าระวัง",
        hex: COLORS.warn,
        bg: "#FFF5D9",
        icon: <WarningOutlined />,
    },

    3: {
        key: "critical",
        label: "Critical",
        thaiLabel: "ต้องซ่อมแซมด่วน",
        hex: COLORS.danger,
        bg: "#F9EDEA",
        icon: <CloseCircleOutlined />,
    },
};

// ============================================================
// Get Priority Class
// รองรับข้อมูลทั้งจาก:
// report.priority_class
// report.ai_analysis.priority_class
// report.analysis.priority_class
// ============================================================

const getPriorityClass = (report) => {
    // รองรับหลายรูปแบบของข้อมูลที่อาจมาจาก Backend / Dashboard
    const value =
        report?.priority_class ??
        report?.priorityClass ??
        report?.priority ??
        report?.ai_analysis?.priority_class ??
        report?.ai_analysis?.priorityClass ??
        report?.aiAnalysis?.priority_class ??
        report?.aiAnalysis?.priorityClass ??
        report?.analysis?.priority_class ??
        report?.analysis?.priorityClass;

    const priorityClass = Number(value);

    if ([1, 2, 3].includes(priorityClass)) {
        return priorityClass;
    }

    // --------------------------------------------------------
    // Fallback จาก damage_level
    // --------------------------------------------------------

    const damageLevel = String(
        report?.damage_level ??
        report?.damageLevel ??
        report?.severity ??
        ""
    ).toLowerCase();

    if (
        damageLevel === "critical" ||
        damageLevel.includes("critical") ||
        damageLevel.includes("วิกฤต")
    ) {
        return 3;
    }

    if (
        damageLevel === "warning" ||
        damageLevel.includes("warning") ||
        damageLevel.includes("เตือน")
    ) {
        return 2;
    }

    if (
        damageLevel === "good" ||
        damageLevel.includes("good") ||
        damageLevel.includes("ปกติ")
    ) {
        return 1;
    }

    return null;
};

// ============================================================
// Convert Backend Priority
// ============================================================

const getPriorityConfig = (report) => {
    const priorityClass = getPriorityClass(report);

    if (PRIORITY_CONFIG[priorityClass]) {
        return PRIORITY_CONFIG[priorityClass];
    }

    const value = String(
        report?.priorityLabel ||
            report?.priority ||
            report?.severity ||
            report?.damage_level ||
            ""
    ).toLowerCase();

    if (value.includes("critical") || value.includes("วิกฤต")) {
        return PRIORITY_CONFIG[3];
    }

    if (value.includes("warning") || value.includes("เตือน")) {
        return PRIORITY_CONFIG[2];
    }

    if (value.includes("good") || value.includes("ปกติ")) {
        return PRIORITY_CONFIG[1];
    }

    return null;
};

// ============================================================
// Marker
// ============================================================

const createSeverityMarker = (report) => {
    const priority = getPriorityConfig(report);

    let color = "blue";

    if (priority?.key === "critical") {
        color = "red";
    } else if (priority?.key === "warning") {
        color = "orange";
    } else if (priority?.key === "good") {
        color = "green";
    }

    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,

        shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

        iconSize: [25, 41],

        iconAnchor: [12, 41],

        popupAnchor: [1, -34],

        shadowSize: [41, 41],
    });
};

// ============================================================
// Cluster Icon
// ============================================================

const createClusterIcon = (cluster) => {
    const markers = cluster.getAllChildMarkers();

    const priorities = markers.map((item) => {
        const report = item.options.report;

        return getPriorityClass(report);
    });

    let color = COLORS.ok;

    if (priorities.includes(3)) {
        color = COLORS.danger;
    } else if (priorities.includes(2)) {
        color = COLORS.warn;
    } else if (priorities.every((priority) => ![1, 2, 3].includes(priority))) {
        color = COLORS.info;
    }

    return L.divIcon({
        html: `
            <div
                style="
                    width:42px;
                    height:42px;
                    border-radius:50%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    background:${color};
                    color:#fff;
                    font-family:Sarabun, sans-serif;
                    font-size:14px;
                    font-weight:700;
                    border:3px solid rgba(255,255,255,.95);
                    box-shadow:0 2px 7px rgba(20,53,47,.25);
                "
            >
                ${cluster.getChildCount()}
            </div>
        `,

        className: "",

        iconSize: [42, 42],
    });
};

// ============================================================
// Map Viewport
// ============================================================

function MapViewport({ reports }) {
    const map = useMap();

    useEffect(() => {
        const validReports = reports.filter(
            (report) =>
                Number.isFinite(Number(report.latitude)) &&
                Number.isFinite(Number(report.longitude))
        );

        if (validReports.length === 0) {
            return;
        }

        if (validReports.length === 1) {
            map.setView(
                [
                    Number(validReports[0].latitude),
                    Number(validReports[0].longitude),
                ],
                15
            );

            return;
        }

        map.fitBounds(
            L.latLngBounds(
                validReports.map((report) => [
                    Number(report.latitude),
                    Number(report.longitude),
                ])
            ),
            {
                padding: [50, 50],
                maxZoom: 15,
            }
        );
    }, [map, reports]);

    return null;
}

// ============================================================
// Format Helpers
// ============================================================

const formatPercent = (value) => {
    if (value == null || Number.isNaN(Number(value))) {
        return null;
    }

    const number = Number(value);

    if (number <= 1) {
        return `${(number * 100).toFixed(1)}%`;
    }

    return `${number.toFixed(1)}%`;
};

const getPercentNumber = (value) => {
    if (value == null || Number.isNaN(Number(value))) {
        return 0;
    }

    const number = Number(value);

    if (number <= 1) {
        return number * 100;
    }

    return number;
};

const formatDate = (value) => {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
    });
};

// ============================================================
// Probability Row
// ============================================================

function ProbabilityRow({ label, value, color }) {
    const percent = getPercentNumber(value);

    return (
        <div
            style={{
                marginBottom: 8,
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 3,
                }}
            >
                <Text
                    style={{
                        fontFamily: "Sarabun, sans-serif",
                        fontSize: 12,
                        color: "#52655F",
                    }}
                >
                    {label}
                </Text>

                <Text
                    strong
                    style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: COLORS.ink,
                    }}
                >
                    {formatPercent(value) || "-"}
                </Text>
            </div>

            <Progress
                percent={Math.min(100, Math.max(0, percent))}
                showInfo={false}
                strokeColor={color}
                size="small"
            />
        </div>
    );
}

// ============================================================
// Report Popup
// ============================================================

function ReportPopup({ report }) {
    const priority = getPriorityConfig(report);

    // --------------------------------------------------------
    // Confidence
    // --------------------------------------------------------

    let confidence = null;

    if (report?.confidence_score != null) {
        confidence = getPercentNumber(report.confidence_score);
    } else if (report?.confidence != null) {
        confidence = getPercentNumber(report.confidence);
    }

    // --------------------------------------------------------
    // Status
    // --------------------------------------------------------

    const status = String(report?.status || "Unknown");

    const statusConfig = {
        completed: {
            label: "Completed",
            color: COLORS.ok,
            bg: "#E8F3EE",
        },

        processing: {
            label: "Processing",
            color: COLORS.info,
            bg: "#E8F1F3",
        },

        pending: {
            label: "Pending",
            color: COLORS.warn,
            bg: "#FFF5D9",
        },

        rejected: {
            label: "Rejected",
            color: COLORS.danger,
            bg: "#F9EDEA",
        },
    };

    const currentStatus = statusConfig[status.toLowerCase()] || {
        label: status,
        color: "#687A74",
        bg: "#EEF2F0",
    };

    return (
        <div
            style={{
                width: 320,
                maxWidth: "100%",
                fontFamily: "Sarabun, sans-serif",
                color: COLORS.ink,
            }}
        >
            {/* HEADER */}

            <header
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 10,
                }}
            >
                <div
                    style={{
                        minWidth: 0,
                    }}
                >
                    <div
                        style={{
                            fontFamily: "Kanit, Sarabun, sans-serif",
                            fontSize: 17,
                            fontWeight: 600,
                            color: COLORS.ink,
                            lineHeight: 1.25,
                        }}
                    >
                        รายงาน #{report.id}
                    </div>

                    <div
                        style={{
                            marginTop: 3,
                            color: "#687A74",
                            fontSize: 12,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {report.title || report.road_name || "ไม่ระบุถนน"}
                    </div>
                </div>

                <span
                    style={{
                        flexShrink: 0,
                        padding: "4px 8px",
                        borderRadius: 6,
                        background: currentStatus.bg,
                        color: currentStatus.color,
                        fontSize: 11,
                        fontWeight: 600,
                    }}
                >
                    {currentStatus.label}
                </span>
            </header>

            <Divider
                style={{
                    margin: "10px 0 12px",
                    borderColor: "#E3EAE7",
                }}
            />

            {/* PRIORITY */}

            {priority ? (
                <section
                    style={{
                        border: `1px solid ${priority.hex}55`,
                        borderLeft: `4px solid ${priority.hex}`,
                        borderRadius: 8,
                        padding: "10px 12px",
                        marginBottom: 12,
                        background: priority.bg,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                        }}
                    >
                        <span
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "#FFFFFF",
                                color: priority.hex,
                                fontSize: 16,
                            }}
                        >
                            {priority.icon}
                        </span>

                        <div>
                            <div
                                style={{
                                    color: priority.hex,
                                    fontFamily: "Kanit, Sarabun, sans-serif",
                                    fontSize: 14,
                                    fontWeight: 600,
                                }}
                            >
                                {priority.label}
                            </div>

                            <div
                                style={{
                                    color: "#65756F",
                                    fontSize: 11,
                                }}
                            >
                                {priority.thaiLabel}
                            </div>
                        </div>
                    </div>
                </section>
            ) : (
                <section
                    style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: COLORS.mist,
                        color: "#687A74",
                        fontSize: 12,
                        marginBottom: 12,
                    }}
                >
                    ยังไม่มีผลการวิเคราะห์จาก AI
                </section>
            )}

            {/* CONFIDENCE */}

            {confidence != null && (
                <section
                    style={{
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 5,
                        }}
                    >
                        <Text
                            strong
                            style={{
                                fontSize: 12,
                                color: COLORS.ink,
                            }}
                        >
                            AI Confidence
                        </Text>

                        <Text
                            strong
                            style={{
                                fontFamily: "monospace",
                                fontSize: 11,
                                color: COLORS.ink,
                            }}
                        >
                            {confidence.toFixed(1)}%
                        </Text>
                    </div>

                    <Progress
                        percent={Math.min(100, Math.max(0, confidence))}
                        showInfo={false}
                        strokeColor={priority?.hex || COLORS.info}
                        size="small"
                    />
                </section>
            )}

            {/* AI PROBABILITY */}

            {(report?.proba_normal != null ||
                report?.proba_warning != null ||
                report?.proba_critical != null) && (
                <section
                    style={{
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: COLORS.ink,
                            marginBottom: 8,
                        }}
                    >
                        AI Probability
                    </div>

                    <ProbabilityRow
                        label="Good"
                        value={report.proba_normal}
                        color={COLORS.ok}
                    />

                    <ProbabilityRow
                        label="Warning"
                        value={report.proba_warning}
                        color={COLORS.warn}
                    />

                    <ProbabilityRow
                        label="Critical"
                        value={report.proba_critical}
                        color={COLORS.danger}
                    />
                </section>
            )}

            {/* REPORT INFORMATION */}

            <section
                style={{
                    background: COLORS.paper,
                    border: "1px solid #E1E9E5",
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 12,
                }}
            >
                {/* Location */}

                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 9,
                    }}
                >
                    <EnvironmentOutlined
                        style={{
                            color: COLORS.ink,
                            marginTop: 3,
                        }}
                    />

                    <div>
                        <div
                            style={{
                                color: "#7A8984",
                                fontSize: 10,
                                marginBottom: 1,
                            }}
                        >
                            LOCATION
                        </div>

                        <div
                            style={{
                                fontSize: 12,
                                color: COLORS.ink,
                            }}
                        >
                            {report.location ||
                                report.road_name ||
                                "ไม่ระบุพิกัด"}
                        </div>
                    </div>
                </div>

                {/* GPS */}

                {report.latitude != null && report.longitude != null && (
                    <div
                        style={{
                            marginLeft: 25,
                            marginBottom: 9,
                        }}
                    >
                        <div
                            style={{
                                color: "#7A8984",
                                fontSize: 10,
                                marginBottom: 2,
                            }}
                        >
                            GPS COORDINATES
                        </div>

                        <div
                            style={{
                                fontFamily: "monospace",
                                fontSize: 11,
                                color: COLORS.ink,
                            }}
                        >
                            {Number(report.latitude).toFixed(6)},{" "}
                            {Number(report.longitude).toFixed(6)}
                        </div>
                    </div>
                )}

                {/* Reporter */}

                {report.reporter && (
                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                            marginBottom: 9,
                        }}
                    >
                        <UserOutlined
                            style={{
                                color: "#7A8984",
                                marginTop: 3,
                            }}
                        />

                        <div>
                            <div
                                style={{
                                    color: "#7A8984",
                                    fontSize: 10,
                                    marginBottom: 1,
                                }}
                            >
                                REPORTER
                            </div>

                            <div
                                style={{
                                    fontSize: 12,
                                    color: COLORS.ink,
                                }}
                            >
                                {report.reporter}
                            </div>
                        </div>
                    </div>
                )}

                {/* Created */}

                {report.created_at && (
                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                        }}
                    >
                        <ClockCircleOutlined
                            style={{
                                color: "#7A8984",
                                marginTop: 3,
                            }}
                        />

                        <div>
                            <div
                                style={{
                                    color: "#7A8984",
                                    fontSize: 10,
                                    marginBottom: 1,
                                }}
                            >
                                REPORTED AT
                            </div>

                            <div
                                style={{
                                    fontSize: 12,
                                    color: COLORS.ink,
                                }}
                            >
                                {formatDate(report.created_at)}
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* DESCRIPTION */}

            {report.description && (
                <section
                    style={{
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: COLORS.ink,
                            marginBottom: 4,
                        }}
                    >
                        รายละเอียด
                    </div>

                    <div
                        style={{
                            fontSize: 12,
                            color: "#5E6F69",
                            lineHeight: 1.55,
                        }}
                    >
                        {report.description}
                    </div>
                </section>
            )}

            {/* ACTION */}

            <Button
                block
                onClick={() => {
                    if (typeof report.onViewDetail === "function") {
                        report.onViewDetail(report);
                    }
                }}
                style={{
                    height: 36,
                    borderRadius: 7,
                    borderColor: COLORS.ink,
                    background: COLORS.ink,
                    color: "#FFFFFF",
                    fontFamily: "Sarabun, sans-serif",
                    fontWeight: 600,
                }}
            >
                ดูรายละเอียดรายงาน
            </Button>
        </div>
    );
}

// ============================================================
// Main MapView
// ============================================================

export default function MapView({ reports = [], onViewDetail }) {
    const mapRef = useRef(null);

    const [keyword, setKeyword] = useState("");

    const [mapType, setMapType] = useState("map");

    const [showLive, setShowLive] = useState(true);

    // ========================================================
    // Normalize Reports
    // ========================================================

    const normalizedReports = useMemo(() => {
        if (!Array.isArray(reports)) {
            return [];
        }

        return reports
            .map((report) => ({
                ...report,

                latitude:
                    report.latitude != null ? Number(report.latitude) : null,

                longitude:
                    report.longitude != null ? Number(report.longitude) : null,

                onViewDetail,
            }))
            .filter(
                (report) =>
                    Number.isFinite(report.latitude) &&
                    Number.isFinite(report.longitude)
            );
    }, [reports, onViewDetail]);

    // ========================================================
    // Search
    // ========================================================

    const filteredReports = useMemo(() => {
        if (!keyword.trim()) {
            return normalizedReports;
        }

        const searchText = keyword.toLowerCase().trim();

        return normalizedReports.filter(
            (report) =>
                String(report.id ?? "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(report.title ?? "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(report.location ?? "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(report.road_name ?? "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(report.description ?? "")
                    .toLowerCase()
                    .includes(searchText)
        );
    }, [keyword, normalizedReports]);

    // ========================================================
    // Statistics
    //
    // สำคัญ:
    // ใช้ normalizedReports ไม่ใช่ filteredReports
    // ดังนั้น Search จะไม่ทำให้จำนวนสถิติเปลี่ยน
    // ========================================================

    const statistics = useMemo(() => {
        let critical = 0;
        let warning = 0;
        let good = 0;
        let noAnalysis = 0;

        normalizedReports.forEach((report) => {
            const priorityClass = getPriorityClass(report);

            if (priorityClass === 3) {
                critical++;
            } else if (priorityClass === 2) {
                warning++;
            } else if (priorityClass === 1) {
                good++;
            } else {
                noAnalysis++;
            }
        });

        return {
            total: normalizedReports.length,
            critical,
            warning,
            good,
            noAnalysis,
        };
    }, [normalizedReports]);

    // ========================================================
    // Tile
    // ========================================================

    const tileUrl =
        mapType === "map"
            ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

    // ========================================================
    // Reset
    // ========================================================

    const resetMap = () => {
        const validReports = normalizedReports.filter(
            (report) =>
                Number.isFinite(report.latitude) &&
                Number.isFinite(report.longitude)
        );

        if (validReports.length === 0) {
            return;
        }

        if (validReports.length === 1) {
            mapRef.current?.flyTo(
                [validReports[0].latitude, validReports[0].longitude],
                15,
                {
                    duration: 0.7,
                }
            );

            return;
        }

        const bounds = L.latLngBounds(
            validReports.map((report) => [report.latitude, report.longitude])
        );

        mapRef.current?.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 15,
        });
    };

    // ========================================================
    // Fullscreen
    // ========================================================

    const fullscreen = () => {
        const mapElement = document.querySelector(".leaflet-container");

        mapElement?.requestFullscreen?.();
    };

    // ========================================================
    // Render
    // ========================================================

    return (
        <section
            style={{
                position: "relative",
                width: "100%",
                height: 620,
                overflow: "hidden",
                borderRadius: 12,
                border: `1px solid ${COLORS.line}`,
                background: COLORS.paper,
            }}
        >
            {/* ==================================================
                TOOLBAR
            ================================================== */}

            <header
                style={{
                    position: "absolute",
                    top: 14,
                    left: 14,
                    right: 14,
                    zIndex: 999,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: 8,
                    background: "rgba(255,255,255,.96)",
                    border: "1px solid rgba(197,212,207,.9)",
                    borderRadius: 9,
                    boxShadow: "0 3px 12px rgba(20,53,47,.12)",
                    backdropFilter: "blur(8px)",
                }}
            >
                {/* Search */}

                <Input
                    allowClear
                    prefix={
                        <SearchOutlined
                            style={{
                                color: "#7A8984",
                            }}
                        />
                    }
                    placeholder="ค้นหารายงาน / ถนน"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    style={{
                        width: 230,
                        height: 34,
                        borderRadius: 7,
                    }}
                />

                {/* Map Type */}

                <Segmented
                    value={mapType}
                    onChange={setMapType}
                    options={[
                        {
                            label: "แผนที่",
                            value: "map",
                        },
                        {
                            label: "ดาวเทียม",
                            value: "satellite",
                        },
                    ]}
                    style={{
                        height: 34,
                        borderRadius: 7,
                    }}
                />

                {/* Reset */}

                <Button
                    icon={<ReloadOutlined />}
                    onClick={resetMap}
                    style={{
                        height: 34,
                        borderRadius: 7,
                        color: COLORS.ink,
                    }}
                >
                    รีเซ็ต
                </Button>

                {/* Fullscreen */}

                <Button
                    icon={<FullscreenOutlined />}
                    onClick={fullscreen}
                    style={{
                        height: 34,
                        borderRadius: 7,
                        color: COLORS.ink,
                    }}
                >
                    เต็มจอ
                </Button>

                {/* Reports */}

                <Button
                    icon={<DashboardOutlined />}
                    onClick={() => setShowLive(!showLive)}
                    style={{
                        height: 34,
                        marginLeft: "auto",
                        borderColor: showLive ? COLORS.ink : COLORS.line,
                        background: showLive ? COLORS.ink : "#FFFFFF",
                        color: showLive ? "#FFFFFF" : COLORS.ink,
                    }}
                >
                    {showLive ? "ซ่อนข้อมูล" : "แสดงข้อมูล"}
                </Button>
            </header>

            {/* ==================================================
                LIVE STATISTICS
            ================================================== */}

            {showLive && (
                <aside
                    style={{
                        position: "absolute",
                        top: 72,
                        left: 14,
                        zIndex: 998,
                        width: 235,
                        background: "rgba(255,255,255,.96)",
                        border: `1px solid ${COLORS.line}`,
                        borderRadius: 10,
                        padding: 13,
                        boxShadow: "0 3px 12px rgba(20,53,47,.12)",
                        backdropFilter: "blur(8px)",
                    }}
                >
                    {/* Header */}

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 5,
                        }}
                    >
                        <div
                            style={{
                                fontFamily: "Kanit, Sarabun, sans-serif",
                                fontSize: 14,
                                fontWeight: 600,
                                color: COLORS.ink,
                            }}
                        >
                            รายงานบนแผนที่
                        </div>

                        <span
                            style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background: COLORS.ok,
                                boxShadow: `0 0 0 3px ${COLORS.ok}22`,
                            }}
                        />
                    </div>

                    {/* Total */}

                    <div
                        style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 7,
                            marginBottom: 9,
                        }}
                    >
                        <span
                            style={{
                                fontFamily: "Kanit, Sarabun, sans-serif",
                                fontSize: 30,
                                lineHeight: 1,
                                fontWeight: 600,
                                color: COLORS.ink,
                            }}
                        >
                            {statistics.total}
                        </span>

                        <span
                            style={{
                                fontSize: 11,
                                color: "#74837E",
                            }}
                        >
                            รายการ
                        </span>
                    </div>

                    {/* Priority Summary */}

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: 5,
                        }}
                    >
                        {/* Critical */}

                        <div
                            style={{
                                padding: "6px 5px",
                                borderRadius: 6,
                                background: "#F9EDEA",
                                textAlign: "center",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: COLORS.danger,
                                }}
                            >
                                {statistics.critical}
                            </div>

                            <div
                                style={{
                                    fontSize: 9,
                                    color: COLORS.danger,
                                }}
                            >
                                Critical
                            </div>
                        </div>

                        {/* Warning */}

                        <div
                            style={{
                                padding: "6px 5px",
                                borderRadius: 6,
                                background: "#FFF5D9",
                                textAlign: "center",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: COLORS.warn,
                                }}
                            >
                                {statistics.warning}
                            </div>

                            <div
                                style={{
                                    fontSize: 9,
                                    color: COLORS.warn,
                                }}
                            >
                                Warning
                            </div>
                        </div>

                        {/* Good */}

                        <div
                            style={{
                                padding: "6px 5px",
                                borderRadius: 6,
                                background: "#E8F3EE",
                                textAlign: "center",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: COLORS.ok,
                                }}
                            >
                                {statistics.good}
                            </div>

                            <div
                                style={{
                                    fontSize: 9,
                                    color: COLORS.ok,
                                }}
                            >
                                Good
                            </div>
                        </div>
                    </div>

                    {/* No AI */}

                    {statistics.noAnalysis > 0 && (
                        <div
                            style={{
                                marginTop: 7,
                                padding: "5px 7px",
                                borderRadius: 6,
                                background: "#EEF2F0",
                                color: "#687A74",
                                fontSize: 10,
                            }}
                        >
                            ยังไม่มีผล AI {statistics.noAnalysis} รายการ
                        </div>
                    )}
                </aside>
            )}

            {/* ==================================================
                MAP
            ================================================== */}

            <MapContainer
                ref={mapRef}
                center={[14.8781, 102.0156]}
                zoom={13}
                zoomControl={false}
                style={{
                    height: "100%",
                    width: "100%",
                }}
            >
                <MapViewport reports={filteredReports} />

                <ZoomControl position="topright" />

                <ScaleControl position="bottomleft" />

                <TileLayer
                    attribution="© OpenStreetMap contributors"
                    url={tileUrl}
                />

                <MarkerClusterGroup
                    chunkedLoading
                    disableClusteringAtZoom={16}
                    iconCreateFunction={createClusterIcon}
                >
                    {filteredReports.map((report) => (
                        <Marker
                            key={report.id}
                            position={[report.latitude, report.longitude]}
                            icon={createSeverityMarker(report)}
                            report={report}
                        >
                            <Popup maxWidth={360} minWidth={320}>
                                <ReportPopup report={report} />
                            </Popup>
                        </Marker>
                    ))}
                </MarkerClusterGroup>
            </MapContainer>

            {/* ==================================================
                EMPTY SEARCH STATE
            ================================================== */}

            {keyword.trim() && filteredReports.length === 0 && (
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        zIndex: 997,
                        transform: "translate(-50%, -50%)",
                        background: "rgba(255,255,255,.96)",
                        border: `1px solid ${COLORS.line}`,
                        borderRadius: 10,
                        padding: "16px 22px",
                        textAlign: "center",
                        boxShadow: "0 3px 12px rgba(20,53,47,.12)",
                    }}
                >
                    <div
                        style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: COLORS.ink,
                            marginBottom: 3,
                        }}
                    >
                        ไม่พบรายงาน
                    </div>

                    <div
                        style={{
                            fontSize: 11,
                            color: "#74837E",
                        }}
                    >
                        ลองค้นหาด้วยเลขรายงานหรือชื่อถนน
                    </div>
                </div>
            )}
        </section>
    );
}
