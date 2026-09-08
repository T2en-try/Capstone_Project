import { Marker, Popup, useMap } from "react-leaflet";
import { Button, Tag, Divider, Space } from "antd";
import L from "leaflet";

// ========================================
// Leaflet Marker Icon
// ========================================
const icon = new L.Icon({
    iconUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

    shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// ========================================
// Severity Config
// ========================================
const SEVERITY_CONFIG = {
    Critical: {
        color: "red",
        label: "วิกฤต",
    },
    High: {
        color: "orange",
        label: "สูง",
    },
    Medium: {
        color: "gold",
        label: "ปานกลาง",
    },
    Low: {
        color: "green",
        label: "ต่ำ",
    },
};

// ========================================
// Status Config
// ========================================
const STATUS_CONFIG = {
    Completed: {
        color: "green",
        label: "เสร็จสิ้น",
    },
    Processing: {
        color: "blue",
        label: "กำลังประมวลผล",
    },
    Pending: {
        color: "gold",
        label: "รอดำเนินการ",
    },
    Rejected: {
        color: "red",
        label: "ถูกปฏิเสธ",
    },
};

// ========================================
// Format Date
// ========================================
function formatDate(date) {
    if (!date) return "-";

    try {
        return new Date(date).toLocaleString("th-TH", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    } catch {
        return "-";
    }
}

// ========================================
// Format Score
// ========================================
function formatScore(value, digits = 2) {
    if (value == null || Number.isNaN(Number(value))) {
        return "-";
    }

    return Number(value).toFixed(digits);
}

// ========================================
// Marker Layer
// ========================================
export default function MarkerLayer({
    reports = [],
    onSelectRoad,
}) {
    const map = useMap();

    return (
        <>
            {reports.map((report) => {
                // ========================================
                // Validate coordinates
                // ========================================
                if (
                    report.lat == null ||
                    report.lng == null ||
                    Number.isNaN(Number(report.lat)) ||
                    Number.isNaN(Number(report.lng))
                ) {
                    return null;
                }

                const lat = Number(report.lat);
                const lng = Number(report.lng);

                // ========================================
                // Severity
                // ========================================
                const severityConfig =
                    SEVERITY_CONFIG[report.severity] ||
                    SEVERITY_CONFIG.Low;

                // ========================================
                // Status
                // ========================================
                const statusConfig =
                    STATUS_CONFIG[report.status] || {
                        color: "default",
                        label: report.status || "ไม่ทราบสถานะ",
                    };

                return (
                    <Marker
                        key={report.id}
                        position={[lat, lng]}
                        icon={icon}
                        eventHandlers={{
                            click: () => {
                                map.flyTo(
                                    [lat, lng],
                                    16,
                                    {
                                        duration: 0.8,
                                    }
                                );
                            },
                        }}
                    >
                        <Popup minWidth={300}>
                            <div
                                style={{
                                    fontSize: 13,
                                }}
                            >
                                {/* ========================================
                                    Header
                                ======================================== */}
                                <div
                                    style={{
                                        marginBottom: 8,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 16,
                                            fontWeight: 700,
                                            marginBottom: 4,
                                        }}
                                    >
                                        📍{" "}
                                        {report.roadName ||
                                            `Report #${report.id}`}
                                    </div>

                                    <div
                                        style={{
                                            color: "#8c8c8c",
                                            fontSize: 11,
                                        }}
                                    >
                                        Report ID: #{report.id}
                                    </div>
                                </div>

                                <Divider
                                    style={{
                                        margin: "8px 0",
                                    }}
                                />

                                {/* ========================================
                                    Severity + Status
                                ======================================== */}
                                <Space
                                    wrap
                                    size={[4, 4]}
                                    style={{
                                        marginBottom: 8,
                                    }}
                                >
                                    <Tag
                                        color={
                                            severityConfig.color
                                        }
                                    >
                                        {severityConfig.label}
                                    </Tag>

                                    <Tag
                                        color={
                                            statusConfig.color
                                        }
                                    >
                                        {statusConfig.label}
                                    </Tag>
                                </Space>

                                {/* ========================================
                                    Description
                                ======================================== */}
                                <div
                                    style={{
                                        marginBottom: 8,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            marginBottom: 3,
                                        }}
                                    >
                                        รายละเอียด
                                    </div>

                                    <div
                                        style={{
                                            color: "#595959",
                                        }}
                                    >
                                        {report.description ||
                                            "ไม่มีรายละเอียดความเสียหาย"}
                                    </div>
                                </div>

                                {/* ========================================
                                    Reporter
                                ======================================== */}
                                {report.reporter_name && (
                                    <div
                                        style={{
                                            marginBottom: 6,
                                        }}
                                    >
                                        <span
                                            style={{
                                                color: "#8c8c8c",
                                            }}
                                        >
                                            ผู้แจ้ง:{" "}
                                        </span>

                                        <b>
                                            {report.reporter_name}
                                        </b>
                                    </div>
                                )}

                                {/* ========================================
                                    Created At
                                ======================================== */}
                                {report.created_at && (
                                    <div
                                        style={{
                                            marginBottom: 8,
                                        }}
                                    >
                                        <span
                                            style={{
                                                color: "#8c8c8c",
                                            }}
                                        >
                                            วันที่แจ้ง:{" "}
                                        </span>

                                        {formatDate(
                                            report.created_at
                                        )}
                                    </div>
                                )}

                                <Divider
                                    style={{
                                        margin: "8px 0",
                                    }}
                                />

                                {/* ========================================
                                    AI Analysis
                                ======================================== */}
                                <div
                                    style={{
                                        fontWeight: 600,
                                        marginBottom: 6,
                                    }}
                                >
                                    🤖 AI Analysis
                                </div>

                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                            "1fr 1fr",
                                        gap: 6,
                                        marginBottom: 8,
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                fontSize: 11,
                                                color: "#8c8c8c",
                                            }}
                                        >
                                            Fusion Score
                                        </div>

                                        <div
                                            style={{
                                                fontWeight: 700,
                                            }}
                                        >
                                            {formatScore(
                                                report.fusion_score,
                                                3
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <div
                                            style={{
                                                fontSize: 11,
                                                color: "#8c8c8c",
                                            }}
                                        >
                                            Severity Score
                                        </div>

                                        <div
                                            style={{
                                                fontWeight: 700,
                                            }}
                                        >
                                            {formatScore(
                                                report.severity_score,
                                                2
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ========================================
                                    Decision
                                ======================================== */}
                                {report.decision && (
                                    <div
                                        style={{
                                            marginBottom: 8,
                                        }}
                                    >
                                        <span
                                            style={{
                                                color: "#8c8c8c",
                                            }}
                                        >
                                            AI Decision:{" "}
                                        </span>

                                        <b>
                                            {report.decision}
                                        </b>
                                    </div>
                                )}

                                {/* ========================================
                                    Coordinates
                                ======================================== */}
                                <div
                                    style={{
                                        background: "#f5f5f5",
                                        borderRadius: 6,
                                        padding: "6px 8px",
                                        marginBottom: 10,
                                        fontSize: 11,
                                    }}
                                >
                                    <div>
                                        <b>Latitude:</b>{" "}
                                        {lat.toFixed(6)}
                                    </div>

                                    <div>
                                        <b>Longitude:</b>{" "}
                                        {lng.toFixed(6)}
                                    </div>
                                </div>

                                {/* ========================================
                                    Select Report
                                ======================================== */}
                                <Button
                                    type="primary"
                                    block
                                    onClick={() =>
                                        onSelectRoad?.(report)
                                    }
                                >
                                    ดูข้อมูลถนน
                                </Button>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </>
    );
}