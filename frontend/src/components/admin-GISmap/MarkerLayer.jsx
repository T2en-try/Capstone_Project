import { Marker, Popup, useMap } from "react-leaflet";
import { Button, Tag, Divider, Space } from "antd";
import L from "leaflet";

// ========================================
// Priority Config
// ========================================
const PRIORITY_CONFIG = {
    Critical: {
        color: "#DC2626",
        label: "เร่งด่วน",
        bg: "#FEF2F2",
    },

    High: {
        color: "#F59E0B",
        label: "สูง",
        bg: "#FFFBEB",
    },

    Low: {
        color: "#16A34A",
        label: "ต่ำ",
        bg: "#F0FDF4",
    },
};

// ========================================
// Get Priority
// ========================================
function getPriority(report) {
    // ----------------------------------------
    // 1. priority_class จาก AI
    // ----------------------------------------
    const priorityClass = Number(report?.priority_class);

    if (priorityClass === 3) {
        return "Critical";
    }

    if (priorityClass === 2) {
        return "High";
    }

    if (priorityClass === 1) {
        return "Low";
    }

    // ----------------------------------------
    // 2. priority_level จาก CASP / Backend
    // ----------------------------------------
    const level = String(
        report?.priority_level || ""
    ).toLowerCase();

    if (level === "critical") {
        return "Critical";
    }

    if (level === "high") {
        return "High";
    }

    if (level === "low") {
        return "Low";
    }

    // ----------------------------------------
    // 3. fallback จาก severity
    // ----------------------------------------
    const severity = String(
        report?.severity || ""
    ).toLowerCase();

    if (severity === "critical") {
        return "Critical";
    }

    if (
        severity === "high" ||
        severity === "warning"
    ) {
        return "High";
    }

    return "Low";
}

// ========================================
// Create Colored Marker
// ========================================
function createPriorityIcon(priority) {
    const config =
        PRIORITY_CONFIG[priority] ||
        PRIORITY_CONFIG.Low;

    return L.divIcon({
        className: "road-monitor-priority-marker",

        html: `
            <div
                style="
                    position: relative;
                    width: 38px;
                    height: 48px;
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                "
            >

                <!-- Pin -->
                <div
                    style="
                        position: absolute;
                        top: 0;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 30px;
                        height: 30px;
                        background: ${config.color};
                        border: 3px solid #FFFFFF;
                        border-radius: 50% 50% 50% 0;
                        transform-origin: 50% 50%;
                        transform:
                            translateX(-50%)
                            rotate(-45deg);
                        box-shadow:
                            0 2px 6px rgba(0,0,0,0.30);
                    "
                ></div>

                <!-- Center -->
                <div
                    style="
                        position: absolute;
                        top: 8px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 10px;
                        height: 10px;
                        background: #FFFFFF;
                        border-radius: 50%;
                        z-index: 2;
                    "
                ></div>

            </div>
        `,

        iconSize: [38, 48],
        iconAnchor: [19, 43],
        popupAnchor: [0, -42],
    });
}

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
        return new Date(date).toLocaleString(
            "th-TH",
            {
                dateStyle: "medium",
                timeStyle: "short",
            }
        );
    } catch {
        return "-";
    }
}

// ========================================
// Format Score
// ========================================
function formatScore(value, digits = 2) {
    if (
        value == null ||
        Number.isNaN(Number(value))
    ) {
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
                    Number.isNaN(
                        Number(report.lat)
                    ) ||
                    Number.isNaN(
                        Number(report.lng)
                    )
                ) {
                    return null;
                }

                const lat = Number(report.lat);
                const lng = Number(report.lng);

                // ========================================
                // Priority
                // ========================================
                const priority =
                    getPriority(report);

                const priorityConfig =
                    PRIORITY_CONFIG[priority];

                // ========================================
                // Status
                // ========================================
                const statusConfig =
                    STATUS_CONFIG[
                        report.status
                    ] || {
                        color: "default",
                        label:
                            report.status ||
                            "ไม่ทราบสถานะ",
                    };

                // ========================================
                // Marker Icon
                // ========================================
                const priorityIcon =
                    createPriorityIcon(priority);

                return (
                    <Marker
                        key={report.id}
                        position={[lat, lng]}
                        icon={priorityIcon}
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
                                            report.road_name ||
                                            `Report #${report.id}`}
                                    </div>

                                    <div
                                        style={{
                                            color: "#8C8C8C",
                                            fontSize: 11,
                                        }}
                                    >
                                        Report ID: #
                                        {report.id}
                                    </div>
                                </div>

                                <Divider
                                    style={{
                                        margin: "8px 0",
                                    }}
                                />

                                {/* ========================================
                                    Priority + Status
                                ======================================== */}
                                <Space
                                    wrap
                                    size={[4, 4]}
                                    style={{
                                        marginBottom: 10,
                                    }}
                                >
                                    <Tag
                                        color={
                                            priority ===
                                            "Critical"
                                                ? "red"
                                                : priority ===
                                                  "High"
                                                ? "orange"
                                                : "green"
                                        }
                                    >
                                        {priorityConfig.label}
                                        {" "}
                                        ({priority})
                                    </Tag>

                                    <Tag
                                        color={
                                            statusConfig.color
                                        }
                                    >
                                        {
                                            statusConfig.label
                                        }
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
                                                color: "#8C8C8C",
                                            }}
                                        >
                                            ผู้แจ้ง:{" "}
                                        </span>

                                        <b>
                                            {
                                                report.reporter_name
                                            }
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
                                                color: "#8C8C8C",
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
                                    Priority Analysis
                                ======================================== */}
                                <div
                                    style={{
                                        fontWeight: 600,
                                        marginBottom: 7,
                                    }}
                                >
                                    🤖 AI Priority
                                </div>

                                <div
                                    style={{
                                        background:
                                            priorityConfig.bg,
                                        borderLeft:
                                            `4px solid ${priorityConfig.color}`,
                                        borderRadius: 6,
                                        padding:
                                            "8px 10px",
                                        marginBottom: 10,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: "#8C8C8C",
                                        }}
                                    >
                                        Priority Level
                                    </div>

                                    <div
                                        style={{
                                            color:
                                                priorityConfig.color,
                                            fontSize: 17,
                                            fontWeight: 700,
                                        }}
                                    >
                                        {
                                            priorityConfig.label
                                        }
                                    </div>
                                </div>

                                {/* ========================================
                                    AI Score
                                ======================================== */}
                                {(report.fusion_score !=
                                    null ||
                                    report.severity_score !=
                                        null) && (
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
                                                    color: "#8C8C8C",
                                                }}
                                            >
                                                Priority Score
                                            </div>

                                            <div
                                                style={{
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {formatScore(
                                                    report.fusion_score,
                                                    2
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    color: "#8C8C8C",
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
                                )}

                                {/* ========================================
                                    AI Decision
                                ======================================== */}
                                {report.decision && (
                                    <div
                                        style={{
                                            marginBottom: 8,
                                        }}
                                    >
                                        <span
                                            style={{
                                                color: "#8C8C8C",
                                            }}
                                        >
                                            AI Decision:{" "}
                                        </span>

                                        <b>
                                            {
                                                report.decision
                                            }
                                        </b>
                                    </div>
                                )}

                                {/* ========================================
                                    Coordinates
                                ======================================== */}
                                <div
                                    style={{
                                        background:
                                            "#F5F6F8",
                                        border:
                                            "1px solid #E5E7EB",
                                        borderRadius: 6,
                                        padding:
                                            "7px 9px",
                                        marginBottom: 10,
                                        fontSize: 11,
                                    }}
                                >
                                    <div>
                                        <b>
                                            Latitude:
                                        </b>{" "}
                                        {lat.toFixed(
                                            6
                                        )}
                                    </div>

                                    <div>
                                        <b>
                                            Longitude:
                                        </b>{" "}
                                        {lng.toFixed(
                                            6
                                        )}
                                    </div>
                                </div>

                                {/* ========================================
                                    Select Report
                                ======================================== */}
                                <Button
                                    type="primary"
                                    block
                                    onClick={() =>
                                        onSelectRoad?.(
                                            report
                                        )
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