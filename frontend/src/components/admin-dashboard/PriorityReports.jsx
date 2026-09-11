import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { Button, Progress, Tag, Typography } from "antd";

import {
    WarningOutlined,
    EnvironmentOutlined,
    ArrowRightOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

// ============================================================
// Design System
// ============================================================

const COLORS = {
    ink: "#14352F",
    inkSoft: "#1F4A42",
    mark: "#E6A817",
    line: "#C5D4CF",
    paper: "#F7FAF8",

    danger: "#C45C4A",
    ok: "#2D7A5F",
    warn: "#C4891A",
    info: "#2F6F7E",
};

// ============================================================
// Priority Config
// ============================================================

const PRIORITY_CONFIG = {
    1: {
        key: "good",
        label: "Good",
        thaiLabel: "สภาพปกติ",
        color: COLORS.ok,
        bg: "#E8F3EE",
        icon: <CheckCircleOutlined />,
    },

    2: {
        key: "warning",
        label: "Warning",
        thaiLabel: "ควรเฝ้าระวัง",
        color: COLORS.warn,
        bg: "#FFF5D9",
        icon: <WarningOutlined />,
    },

    3: {
        key: "critical",
        label: "Critical",
        thaiLabel: "ต้องซ่อมแซมด่วน",
        color: COLORS.danger,
        bg: "#F9EDEA",
        icon: <CloseCircleOutlined />,
    },
};

// ============================================================
// Status Config
// ============================================================

const STATUS_CONFIG = {
    pending: {
        label: "รอดำเนินการ",
        color: COLORS.warn,
        bg: "#FFF5D9",
    },

    processing: {
        label: "กำลังดำเนินการ",
        color: COLORS.info,
        bg: "#E8F1F3",
    },

    completed: {
        label: "ดำเนินการเสร็จสิ้น",
        color: COLORS.ok,
        bg: "#E8F3EE",
    },
};

// ============================================================
// Priority Reports
// ============================================================

const PriorityReports = ({ reports = [] }) => {
    const navigate = useNavigate();

    // ========================================================
    // Rank
    // ========================================================

    const ranked = useMemo(() => {
        return [...reports]
            .sort(
                (a, b) =>
                    (Number(b.priorityScore) || 0) -
                        (Number(a.priorityScore) || 0) ||
                    (Number(b.priorityClass) || 0) -
                        (Number(a.priorityClass) || 0)
            )
            .slice(0, 5);
    }, [reports]);

    // ========================================================
    // Empty
    // ========================================================

    if (ranked.length === 0) {
        return (
            <section
                style={{
                    width: "100%",
                    height: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 4px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                    }}
                >
                    <span
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#F9EDEA",
                            color: COLORS.danger,
                            fontSize: 16,
                        }}
                    >
                        <WarningOutlined />
                    </span>

                    <div>
                        <div
                            style={{
                                fontFamily: "Kanit, Sarabun, sans-serif",
                                fontSize: 14,
                                fontWeight: 600,
                                color: COLORS.ink,
                            }}
                        >
                            Priority Reports
                        </div>

                        <div
                            style={{
                                fontFamily: "Sarabun, sans-serif",
                                fontSize: 12,
                                color: "#74837E",
                                marginTop: 2,
                            }}
                        >
                            ยังไม่มีรายงานที่ต้องจัดลำดับความสำคัญ
                        </div>
                    </div>
                </div>

                <Button
                    type="link"
                    onClick={() => navigate("/admin/priority-reports")}
                    style={{
                        color: COLORS.ink,
                        padding: 0,
                    }}
                >
                    ดูทั้งหมด <ArrowRightOutlined />
                </Button>
            </section>
        );
    }

    // ========================================================
    // Render
    // ========================================================

    return (
        <section
            aria-label="Priority Reports"
            style={{
                width: "100%",
                height: "100%",
                fontFamily: "Sarabun, sans-serif",
            }}
        >
            {/* ==================================================
                HEADER
            ================================================== */}

            <header
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                    paddingBottom: 9,
                    borderBottom: "1px solid #E2EAE6",
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
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#F9EDEA",
                            color: COLORS.danger,
                            fontSize: 16,
                        }}
                    >
                        <WarningOutlined />
                    </span>

                    <div>
                        <div
                            style={{
                                fontFamily: "Kanit, Sarabun, sans-serif",
                                fontSize: 16,
                                fontWeight: 600,
                                lineHeight: 1.2,
                                color: COLORS.ink,
                            }}
                        >
                            Priority Reports
                        </div>

                        <div
                            style={{
                                marginTop: 2,
                                color: "#74837E",
                                fontSize: 11,
                            }}
                        >
                            รายงานที่มีความสำคัญสูงสุด
                        </div>
                    </div>
                </div>

                <Button
                    type="link"
                    onClick={() => navigate("/admin/priority-reports")}
                    style={{
                        color: COLORS.ink,
                        padding: 0,
                        height: "auto",
                        fontSize: 12,
                    }}
                >
                    ดูทั้งหมด
                    <ArrowRightOutlined
                        style={{
                            marginLeft: 5,
                        }}
                    />
                </Button>
            </header>

            {/* ==================================================
                LIST
            ================================================== */}

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                }}
            >
                {ranked.map((item, index) => {
                    const priority =
                        PRIORITY_CONFIG[Number(item.priorityClass)];

                    const status =
                        STATUS_CONFIG[
                            String(
                                item.priorityStatus || "pending"
                            ).toLowerCase()
                        ] || STATUS_CONFIG.pending;

                    const score =
                        item.priorityScore != null
                            ? Number(item.priorityScore)
                            : null;

                    return (
                        <article
                            key={item.id ?? `${item.title}-${index}`}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "9px 8px",
                                borderRadius: 9,
                                border: "1px solid transparent",
                                background: index === 0 ? "#FDF9EC" : "#FFFFFF",
                                transition: "all .18s ease",
                            }}
                            onMouseEnter={(event) => {
                                event.currentTarget.style.background =
                                    "#F7FAF8";

                                event.currentTarget.style.borderColor =
                                    COLORS.line;
                            }}
                            onMouseLeave={(event) => {
                                event.currentTarget.style.background =
                                    index === 0 ? "#FDF9EC" : "#FFFFFF";

                                event.currentTarget.style.borderColor =
                                    "transparent";
                            }}
                        >
                            {/* ==================================================
                                RANK
                            ================================================== */}

                            <span
                                style={{
                                    width: 31,
                                    height: 31,
                                    flexShrink: 0,
                                    borderRadius: 8,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background:
                                        index === 0
                                            ? "#F9EDEA"
                                            : COLORS.mist || "#E8EFEC",
                                    color:
                                        index === 0 ? COLORS.danger : "#63746E",
                                    fontFamily: "monospace",
                                    fontSize: 11,
                                    fontWeight: 700,
                                }}
                            >
                                {String(index + 1).padStart(2, "0")}
                            </span>

                            {/* ==================================================
                                MAIN CONTENT
                            ================================================== */}

                            <div
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                }}
                            >
                                {/* Title + Score */}

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 10,
                                    }}
                                >
                                    <Text
                                        strong
                                        ellipsis
                                        style={{
                                            maxWidth: "70%",
                                            fontFamily: "Sarabun, sans-serif",
                                            fontSize: 13,
                                            color: COLORS.ink,
                                        }}
                                    >
                                        {item.title ||
                                            `รายงาน #${item.id ?? "-"}`}
                                    </Text>

                                    <span
                                        style={{
                                            flexShrink: 0,
                                            textAlign: "right",
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: "block",
                                                fontFamily: "monospace",
                                                fontSize: 15,
                                                lineHeight: 1.1,
                                                fontWeight: 700,
                                                color:
                                                    priority?.color ||
                                                    "#7A8984",
                                            }}
                                        >
                                            {score != null
                                                ? score.toFixed(2)
                                                : "-"}
                                        </span>

                                        <span
                                            style={{
                                                display: "block",
                                                marginTop: 2,
                                                fontSize: 9,
                                                color: "#8A9893",
                                            }}
                                        >
                                            Priority Score
                                        </span>
                                    </span>
                                </div>

                                {/* Location */}

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                        marginTop: 3,
                                        color: "#7A8984",
                                        fontSize: 11,
                                    }}
                                >
                                    <EnvironmentOutlined />

                                    <span
                                        style={{
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {item.location ||
                                            item.road_name ||
                                            "ไม่ระบุสถานที่"}
                                    </span>
                                </div>

                                {/* Tags + Progress */}

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                        marginTop: 7,
                                    }}
                                >
                                    {/* Priority */}

                                    {priority ? (
                                        <span
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 4,
                                                padding: "3px 6px",
                                                borderRadius: 5,
                                                background: priority.bg,
                                                color: priority.color,
                                                fontSize: 10,
                                                fontWeight: 600,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {priority.icon}

                                            {priority.label}
                                        </span>
                                    ) : (
                                        <span
                                            style={{
                                                padding: "3px 6px",
                                                borderRadius: 5,
                                                background: "#EEF2F0",
                                                color: "#71817B",
                                                fontSize: 10,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            ยังไม่มีผลวิเคราะห์
                                        </span>
                                    )}

                                    {/* Status */}

                                    <span
                                        style={{
                                            padding: "3px 6px",
                                            borderRadius: 5,
                                            background: status.bg,
                                            color: status.color,
                                            fontSize: 10,
                                            fontWeight: 500,
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {status.label}
                                    </span>
                                </div>

                                {/* Score Progress */}

                                <div
                                    style={{
                                        marginTop: 6,
                                        paddingRight: 2,
                                    }}
                                >
                                    <Progress
                                        percent={Math.min(
                                            100,
                                            Math.max(0, score || 0)
                                        )}
                                        showInfo={false}
                                        strokeColor={
                                            priority?.color || "#9AA8A3"
                                        }
                                        trailColor="#E8EFEC"
                                        size="small"
                                    />
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
};

export default PriorityReports;
