import { Card, Col, Row, Statistic } from "antd";

import {
    FileTextOutlined,
    ClockCircleOutlined,
    SyncOutlined,
    CheckCircleOutlined,
} from "@ant-design/icons";

import { getReportStatus } from "../../utils/statusHelper";

const COLORS = {
    text: "#1F2937",
    secondary: "#64748B",
    border: "#E5E7EB",

    primary: "#2563EB",
    primarySoft: "#EFF6FF",

    warning: "#F59E0B",
    warningSoft: "#FFFBEB",

    info: "#0284C7",
    infoSoft: "#F0F9FF",

    success: "#16A34A",
    successSoft: "#F0FDF4",
};

const SummaryCards = ({
    stats = {},
    reports = [],
    loading = false,
}) => {
    /* =========================================================
       Calculate Report Status
    ========================================================= */

    const priorityCounts = reports.reduce(
        (acc, report) => {
            const status = getReportStatus(report);

            acc[status] = (acc[status] || 0) + 1;

            return acc;
        },
        {
            pending: 0,
            processing: 0,
            completed: 0,
        }
    );

    /* =========================================================
       Summary Data
    ========================================================= */

    const cards = [
        {
            key: "total",
            title: "รายงานทั้งหมด",
            value:
                reports.length ||
                stats.total_reports ||
                0,
            icon: <FileTextOutlined />,
            color: COLORS.primary,
            bg: COLORS.primarySoft,
        },

        {
            key: "pending",
            title: "รอดำเนินการ",
            value: priorityCounts.pending,
            icon: <ClockCircleOutlined />,
            color: COLORS.warning,
            bg: COLORS.warningSoft,
        },

        {
            key: "processing",
            title: "กำลังดำเนินการ",
            value: priorityCounts.processing,
            icon: <SyncOutlined />,
            color: COLORS.info,
            bg: COLORS.infoSoft,
        },

        {
            key: "completed",
            title: "ดำเนินการเสร็จสิ้น",
            value: priorityCounts.completed,
            icon: <CheckCircleOutlined />,
            color: COLORS.success,
            bg: COLORS.successSoft,
        },
    ];

    /* =========================================================
       Loading
    ========================================================= */

    if (loading) {
        return (
            <Row gutter={[10, 10]}>
                {cards.map((card) => (
                    <Col
                        xs={24}
                        sm={12}
                        lg={6}
                        key={card.key}
                    >
                        <Card
                            size="small"
                            style={{
                                height: 86,
                                borderRadius: 8,
                                borderColor:
                                    COLORS.border,
                                boxShadow: "none",
                            }}
                        >
                            <div
                                style={{
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                }}
                            >
                                <div
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 7,
                                        background:
                                            "#F1F5F9",
                                    }}
                                />

                                <div
                                    style={{
                                        flex: 1,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "55%",
                                            height: 10,
                                            borderRadius: 4,
                                            background:
                                                "#E2E8F0",
                                            marginBottom: 8,
                                        }}
                                    />

                                    <div
                                        style={{
                                            width: "30%",
                                            height: 18,
                                            borderRadius: 4,
                                            background:
                                                "#E2E8F0",
                                        }}
                                    />
                                </div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>
        );
    }

    /* =========================================================
       Render
    ========================================================= */

    return (
        <Row gutter={[10, 10]}>
            {cards.map((card) => (
                <Col
                    xs={24}
                    sm={12}
                    lg={6}
                    key={card.key}
                >
                    <Card
                        size="small"
                        bordered
                        style={{
                            height: 86,
                            borderRadius: 8,
                            borderColor:
                                COLORS.border,
                            boxShadow:
                                "0 1px 2px rgba(15, 23, 42, 0.03)",
                        }}
                        bodyStyle={{
                            padding: "13px 14px",
                            height: "100%",
                        }}
                    >
                        <div
                            style={{
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                            }}
                        >
                            {/* =================================================
                                Icon
                            ================================================= */}

                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    minWidth: 36,
                                    borderRadius: 8,
                                    background:
                                        card.bg,
                                    color:
                                        card.color,
                                    display: "flex",
                                    alignItems:
                                        "center",
                                    justifyContent:
                                        "center",
                                    fontSize: 18,
                                }}
                            >
                                {card.icon}
                            </div>

                            {/* =================================================
                                Statistic
                            ================================================= */}

                            <Statistic
                                title={
                                    <span
                                        style={{
                                            color:
                                                COLORS.secondary,
                                            fontSize: 12,
                                            fontWeight: 500,
                                        }}
                                    >
                                        {card.title}
                                    </span>
                                }
                                value={card.value}
                                valueStyle={{
                                    color:
                                        COLORS.text,
                                    fontSize: 25,
                                    lineHeight: 1.1,
                                    fontWeight: 650,
                                }}
                            />
                        </div>
                    </Card>
                </Col>
            ))}
        </Row>
    );
};

export default SummaryCards;