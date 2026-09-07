import { useMemo, useRef, useState } from "react";

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

import {
    Card,
    Button,
    Input,
    Segmented,
    Tag,
    Space,
    Progress,
    Divider,
    Typography,
} from "antd";

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
// Leaflet Default Marker Fix
// ============================================================

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

    iconUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

    shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ============================================================
// AI Priority Configuration
// ============================================================

const PRIORITY_CONFIG = {
    1: {
        key: "good",
        label: "Good",
        thaiLabel: "สภาพปกติ",
        color: "green",
        hex: "#52c41a",
        icon: <CheckCircleOutlined />,
    },

    2: {
        key: "warning",
        label: "Warning",
        thaiLabel: "ควรเฝ้าระวัง",
        color: "gold",
        hex: "#faad14",
        icon: <WarningOutlined />,
    },

    3: {
        key: "critical",
        label: "Critical",
        thaiLabel: "ต้องซ่อมแซมด่วน",
        color: "red",
        hex: "#ff4d4f",
        icon: <CloseCircleOutlined />,
    },
};

// ============================================================
// Convert Backend Priority
// ============================================================

const getPriorityConfig = (report) => {
    const priorityClass = Number(report?.priority_class);

    if (PRIORITY_CONFIG[priorityClass]) {
        return PRIORITY_CONFIG[priorityClass];
    }

    const value = String(
        report?.priorityLabel ||
            report?.priority ||
            report?.severity ||
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

        return Number(report?.priority_class);
    });

    let color = "#52c41a";

    if (priorities.includes(3)) {
        color = "#ff4d4f";
    } else if (priorities.includes(2)) {
        color = "#faad14";
    }

    return L.divIcon({
        html: `
            <div
                style="
                    background:${color};
                    width:45px;
                    height:45px;
                    border-radius:50%;
                    display:flex;
                    justify-content:center;
                    align-items:center;
                    color:white;
                    font-weight:bold;
                    border:3px solid white;
                    box-shadow:0 2px 8px rgba(0,0,0,.3);
                "
            >
                ${cluster.getChildCount()}
            </div>
        `,

        className: "",

        iconSize: [45, 45],
    });
};

// ============================================================
// Map Viewport
// ============================================================

function MapViewport({ reports }) {
    const map = useMap();

    useMemo(() => {
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
                padding: [40, 40],
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

    // Backend probability = 0.0 - 1.0
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
// Probability Bar
// ============================================================

function ProbabilityRow({
    label,
    value,
    color,
}) {
    const percent = getPercentNumber(value);

    return (
        <div style={{ marginBottom: 8 }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 3,
                }}
            >
                <Text style={{ fontSize: 12 }}>
                    {label}
                </Text>

                <Text strong style={{ fontSize: 12 }}>
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

    const confidence =
        report?.confidence ??
        report?.confidence_score != null
            ? getPercentNumber(
                  report.confidence_score ??
                      report.confidence
              )
            : null;

    const status = String(
        report?.status || "Unknown"
    );

    const statusColor = {
        completed: "green",
        processing: "blue",
        pending: "orange",
        rejected: "red",
    }[status.toLowerCase()] || "default";

    return (
        <div
            style={{
                width: 320,
                maxWidth: "100%",
            }}
        >
            {/* ==================================================
                HEADER
            ================================================== */}

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                    marginBottom: 10,
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#1f1f1f",
                            marginBottom: 3,
                        }}
                    >
                        Report #{report.id}
                    </div>

                    <Text
                        type="secondary"
                        style={{
                            fontSize: 12,
                        }}
                    >
                        {report.title ||
                            report.road_name ||
                            "ไม่ระบุถนน"}
                    </Text>
                </div>

                <Tag
                    color={statusColor}
                    style={{
                        marginRight: 0,
                    }}
                >
                    {status}
                </Tag>
            </div>

            <Divider
                style={{
                    margin: "8px 0 12px",
                }}
            />

            {/* ==================================================
                PRIORITY
            ================================================== */}

            {priority ? (
                <div
                    style={{
                        border: `1px solid ${priority.hex}`,
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 12,
                        background: `${priority.hex}12`,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <span
                            style={{
                                color: priority.hex,
                                fontSize: 18,
                            }}
                        >
                            {priority.icon}
                        </span>

                        <div>
                            <div
                                style={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: priority.hex,
                                }}
                            >
                                {priority.label}
                            </div>

                            <Text
                                type="secondary"
                                style={{
                                    fontSize: 12,
                                }}
                            >
                                {priority.thaiLabel}
                            </Text>
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    style={{
                        padding: 12,
                        borderRadius: 10,
                        background: "#f5f5f5",
                        marginBottom: 12,
                    }}
                >
                    <Text type="secondary">
                        ยังไม่มีผลการประเมินจาก AI
                    </Text>
                </div>
            )}

            {/* ==================================================
                CONFIDENCE
            ================================================== */}

            {confidence != null && (
                <div
                    style={{
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 4,
                        }}
                    >
                        <Text strong>
                            AI Confidence
                        </Text>

                        <Text strong>
                            {confidence.toFixed(1)}%
                        </Text>
                    </div>

                    <Progress
                        percent={Math.min(
                            100,
                            Math.max(0, confidence)
                        )}
                        showInfo={false}
                        strokeColor={
                            priority?.hex || "#1677ff"
                        }
                    />
                </div>
            )}

            {/* ==================================================
                PROBABILITY BREAKDOWN
            ================================================== */}

            {(report?.proba_normal != null ||
                report?.proba_warning != null ||
                report?.proba_critical != null) && (
                <>
                    <Text strong>
                        AI Probability
                    </Text>

                    <div
                        style={{
                            marginTop: 8,
                            marginBottom: 12,
                        }}
                    >
                        <ProbabilityRow
                            label="Good"
                            value={report.proba_normal}
                            color="#52c41a"
                        />

                        <ProbabilityRow
                            label="Warning"
                            value={report.proba_warning}
                            color="#faad14"
                        />

                        <ProbabilityRow
                            label="Critical"
                            value={report.proba_critical}
                            color="#ff4d4f"
                        />
                    </div>
                </>
            )}

            {/* ==================================================
                REPORT INFORMATION
            ================================================== */}

            <div
                style={{
                    background: "#fafafa",
                    borderRadius: 10,
                    padding: 10,
                    marginBottom: 12,
                }}
            >
                {/* Location */}

                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 8,
                    }}
                >
                    <EnvironmentOutlined
                        style={{
                            color: "#1677ff",
                            marginTop: 3,
                        }}
                    />

                    <div>
                        <Text
                            type="secondary"
                            style={{
                                display: "block",
                                fontSize: 11,
                            }}
                        >
                            Location
                        </Text>

                        <Text
                            style={{
                                fontSize: 12,
                            }}
                        >
                            {report.location ||
                                report.road_name ||
                                "ไม่ระบุพิกัด"}
                        </Text>
                    </div>
                </div>

                {/* Coordinates */}

                {report.latitude != null &&
                    report.longitude != null && (
                        <div
                            style={{
                                marginLeft: 24,
                                marginBottom: 8,
                            }}
                        >
                            <Text
                                type="secondary"
                                style={{
                                    fontSize: 11,
                                }}
                            >
                                GPS
                            </Text>

                            <div
                                style={{
                                    fontFamily:
                                        "monospace",
                                    fontSize: 11,
                                }}
                            >
                                {Number(
                                    report.latitude
                                ).toFixed(6)}
                                ,{" "}
                                {Number(
                                    report.longitude
                                ).toFixed(6)}
                            </div>
                        </div>
                    )}

                {/* Reporter */}

                {report.reporter && (
                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                            marginBottom: 8,
                        }}
                    >
                        <UserOutlined
                            style={{
                                color: "#8c8c8c",
                                marginTop: 3,
                            }}
                        />

                        <div>
                            <Text
                                type="secondary"
                                style={{
                                    display: "block",
                                    fontSize: 11,
                                }}
                            >
                                Reporter
                            </Text>

                            <Text
                                style={{
                                    fontSize: 12,
                                }}
                            >
                                {report.reporter}
                            </Text>
                        </div>
                    </div>
                )}

                {/* Created At */}

                {report.created_at && (
                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                        }}
                    >
                        <ClockCircleOutlined
                            style={{
                                color: "#8c8c8c",
                                marginTop: 3,
                            }}
                        />

                        <div>
                            <Text
                                type="secondary"
                                style={{
                                    display: "block",
                                    fontSize: 11,
                                }}
                            >
                                Reported At
                            </Text>

                            <Text
                                style={{
                                    fontSize: 12,
                                }}
                            >
                                {formatDate(
                                    report.created_at
                                )}
                            </Text>
                        </div>
                    </div>
                )}
            </div>

            {/* ==================================================
                DESCRIPTION
            ================================================== */}

            {report.description && (
                <div
                    style={{
                        marginBottom: 12,
                    }}
                >
                    <Text strong>
                        Description
                    </Text>

                    <div
                        style={{
                            marginTop: 5,
                            fontSize: 12,
                            color: "#595959",
                            lineHeight: 1.5,
                        }}
                    >
                        {report.description}
                    </div>
                </div>
            )}

            {/* ==================================================
                ACTION
            ================================================== */}

            <Button
                type="primary"
                block
                size="middle"
                onClick={() => {
                    if (
                        typeof report.onViewDetail ===
                        "function"
                    ) {
                        report.onViewDetail(report);
                    }
                }}
            >
                View Detail
            </Button>
        </div>
    );
}

// ============================================================
// Main MapView
// ============================================================

export default function MapView({
    reports = [],
    onViewDetail,
}) {
    const mapRef = useRef(null);

    const [keyword, setKeyword] = useState("");

    const [mapType, setMapType] =
        useState("map");

    const [showLive, setShowLive] =
        useState(true);

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
                    report.latitude != null
                        ? Number(report.latitude)
                        : null,

                longitude:
                    report.longitude != null
                        ? Number(report.longitude)
                        : null,

                onViewDetail,
            }))
            .filter(
                (report) =>
                    Number.isFinite(
                        report.latitude
                    ) &&
                    Number.isFinite(
                        report.longitude
                    )
            );
    }, [reports, onViewDetail]);

    // ========================================================
    // Search
    // ========================================================

    const filteredReports = useMemo(() => {
        if (!keyword.trim()) {
            return normalizedReports;
        }

        const searchText =
            keyword.toLowerCase();

        return normalizedReports.filter(
            (report) =>
                String(
                    report.id ?? ""
                )
                    .toLowerCase()
                    .includes(searchText) ||
                String(
                    report.title ?? ""
                )
                    .toLowerCase()
                    .includes(searchText) ||
                String(
                    report.location ?? ""
                )
                    .toLowerCase()
                    .includes(searchText) ||
                String(
                    report.road_name ?? ""
                )
                    .toLowerCase()
                    .includes(searchText) ||
                String(
                    report.description ?? ""
                )
                    .toLowerCase()
                    .includes(searchText)
        );
    }, [keyword, normalizedReports]);

    // ========================================================
    // Statistics
    // ========================================================

    const statistics = useMemo(() => {
        return {
            total: filteredReports.length,

            critical: filteredReports.filter(
                (report) =>
                    Number(
                        report.priority_class
                    ) === 3
            ).length,

            warning: filteredReports.filter(
                (report) =>
                    Number(
                        report.priority_class
                    ) === 2
            ).length,

            good: filteredReports.filter(
                (report) =>
                    Number(
                        report.priority_class
                    ) === 1
            ).length,

            noAnalysis: filteredReports.filter(
                (report) =>
                    ![1, 2, 3].includes(
                        Number(
                            report.priority_class
                        )
                    )
            ).length,
        };
    }, [filteredReports]);

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
        const validReports =
            normalizedReports.filter(
                (report) =>
                    Number.isFinite(
                        report.latitude
                    ) &&
                    Number.isFinite(
                        report.longitude
                    )
            );

        if (validReports.length === 0) {
            return;
        }

        if (validReports.length === 1) {
            mapRef.current?.flyTo(
                [
                    validReports[0].latitude,
                    validReports[0].longitude,
                ],
                15
            );

            return;
        }

        const bounds = L.latLngBounds(
            validReports.map((report) => [
                report.latitude,
                report.longitude,
            ])
        );

        mapRef.current?.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: 15,
        });
    };

    // ========================================================
    // Fullscreen
    // ========================================================

    const fullscreen = () => {
        document
            .querySelector(
                ".leaflet-container"
            )
            ?.requestFullscreen?.();
    };

    // ========================================================
    // Render
    // ========================================================

    return (
        <Card
            style={{
                borderRadius: 12,
                overflow: "hidden",
            }}
            styles={{
                body: {
                    padding: 0,
                },
            }}
        >
            <div
                style={{
                    position: "relative",
                    height: 650,
                }}
            >
                {/* ==================================================
                    TOOLBAR
                ================================================== */}

                <div
                    style={{
                        position: "absolute",
                        top: 15,
                        left: 15,
                        zIndex: 999,
                        background: "#fff",
                        padding: 10,
                        borderRadius: 10,
                        boxShadow:
                            "0 2px 12px rgba(0,0,0,.15)",
                    }}
                >
                    <Space wrap>
                        <Input
                            allowClear
                            prefix={
                                <SearchOutlined />
                            }
                            placeholder="Search report"
                            value={keyword}
                            onChange={(event) =>
                                setKeyword(
                                    event.target.value
                                )
                            }
                            style={{
                                width: 220,
                            }}
                        />

                        <Segmented
                            value={mapType}
                            onChange={setMapType}
                            options={[
                                {
                                    label: "Map",
                                    value: "map",
                                },
                                {
                                    label: "Satellite",
                                    value: "satellite",
                                },
                            ]}
                        />

                        <Button
                            icon={
                                <ReloadOutlined />
                            }
                            onClick={resetMap}
                        >
                            Reset
                        </Button>

                        <Button
                            icon={
                                <FullscreenOutlined />
                            }
                            onClick={fullscreen}
                        >
                            Full
                        </Button>

                        <Button
                            type={
                                showLive
                                    ? "primary"
                                    : "default"
                            }
                            icon={
                                <DashboardOutlined />
                            }
                            onClick={() =>
                                setShowLive(
                                    !showLive
                                )
                            }
                        >
                            {showLive
                                ? "Hide Reports"
                                : "Show Reports"}
                        </Button>
                    </Space>
                </div>

                {/* ==================================================
                    LIVE STATISTICS
                ================================================== */}

                {showLive && (
                    <div
                        style={{
                            position: "absolute",
                            top: 90,
                            left: 15,
                            zIndex: 999,
                            background: "#fff",
                            padding: 15,
                            width: 230,
                            borderRadius: 12,
                            boxShadow:
                                "0 2px 12px rgba(0,0,0,.2)",
                        }}
                    >
                        <div
                            style={{
                                fontWeight: 700,
                                marginBottom: 5,
                            }}
                        >
                            Reports
                        </div>

                        <div
                            style={{
                                fontSize: 32,
                                fontWeight: 700,
                                color: "#1677ff",
                                marginBottom: 8,
                            }}
                        >
                            {statistics.total}
                        </div>

                        <Space
                            wrap
                            size={[4, 4]}
                        >
                            <Tag color="red">
                                Critical{" "}
                                {statistics.critical}
                            </Tag>

                            <Tag color="gold">
                                Warning{" "}
                                {statistics.warning}
                            </Tag>

                            <Tag color="green">
                                Good{" "}
                                {statistics.good}
                            </Tag>

                            {statistics.noAnalysis >
                                0 && (
                                <Tag>
                                    No AI{" "}
                                    {
                                        statistics.noAnalysis
                                    }
                                </Tag>
                            )}
                        </Space>
                    </div>
                )}

                {/* ==================================================
                    MAP
                ================================================== */}

                <MapContainer
                    ref={mapRef}
                    center={[
                        14.8781,
                        102.0156,
                    ]}
                    zoom={13}
                    zoomControl={false}
                    style={{
                        height: "100%",
                        width: "100%",
                    }}
                >
                    <MapViewport
                        reports={
                            filteredReports
                        }
                    />

                    <ZoomControl position="topright" />

                    <ScaleControl position="bottomleft" />

                    <TileLayer
                        attribution="© OpenStreetMap contributors"
                        url={tileUrl}
                    />

                    <MarkerClusterGroup
                        chunkedLoading
                        disableClusteringAtZoom={
                            16
                        }
                        iconCreateFunction={
                            createClusterIcon
                        }
                    >
                        {filteredReports.map(
                            (report) => (
                                <Marker
                                    key={report.id}
                                    position={[
                                        report.latitude,
                                        report.longitude,
                                    ]}
                                    icon={createSeverityMarker(
                                        report
                                    )}
                                    report={report}
                                >
                                    <Popup
                                        maxWidth={360}
                                        minWidth={320}
                                    >
                                        <ReportPopup
                                            report={
                                                report
                                            }
                                        />
                                    </Popup>
                                </Marker>
                            )
                        )}
                    </MarkerClusterGroup>
                </MapContainer>
            </div>
        </Card>
    );
}