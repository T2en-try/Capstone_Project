import { useEffect, useState } from "react";
import {
    Spin,
    Typography,
    Tooltip,
} from "antd";
import {
    FireOutlined,
    WarningOutlined,
    CheckCircleOutlined,
    InfoCircleOutlined,
} from "@ant-design/icons";

import { fetchGridPriority } from "../../services/analyticsService";

const { Text } = Typography;

const COLORS = {
    text: "#1F2937",
    secondary: "#64748B",
    muted: "#94A3B8",
    border: "#E5E7EB",

    critical: "#DC2626",
    criticalSoft: "#FEF2F2",

    high: "#F59E0B",
    highSoft: "#FFFBEB",

    low: "#16A34A",
    lowSoft: "#F0FDF4",
};

const LEVEL_CONFIG = {
    critical: {
        icon: <FireOutlined />,
        color: COLORS.critical,
        bg: COLORS.criticalSoft,
        label: "เร่งด่วน",
        subLabel: "Critical",
    },

    high: {
        icon: <WarningOutlined />,
        color: COLORS.high,
        bg: COLORS.highSoft,
        label: "สูง",
        subLabel: "High",
    },

    low: {
        icon: <CheckCircleOutlined />,
        color: COLORS.low,
        bg: COLORS.lowSoft,
        label: "ต่ำ",
        subLabel: "Low",
    },
};

export default function GridPrioritySummary({ days = 7 }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        setError(null);

        fetchGridPriority(days)
            .then((result) => {
                if (mounted) {
                    setData(result);
                }
            })
            .catch((e) => {
                if (mounted) {
                    setError(e.message);
                }
            })
            .finally(() => {
                if (mounted) {
                    setLoading(false);
                }
            });

        return () => {
            mounted = false;
        };
    }, [days]);

    if (loading) {
        return (
            <section
                style={{
                    padding: "18px 0",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <Spin
                    size="small"
                    tip="กำลังคำนวณพื้นที่เร่งด่วน..."
                />
            </section>
        );
    }

    if (error) {
        return (
            <section
                style={{
                    padding: "14px 0",
                    color: COLORS.critical,
                    fontSize: 13,
                }}
            >
                ไม่สามารถโหลดข้อมูล CASP ได้: {error}
            </section>
        );
    }

    if (!data) {
        return null;
    }

    const summary = data.summary || {};

    const cards = [
        {
            key: "critical",
            value: summary.critical || 0,
        },
        {
            key: "high",
            value: summary.high || 0,
        },
        {
            key: "low",
            value: summary.low || 0,
        },
    ];

    return (
        <section
            style={{
                width: "100%",
                marginBottom: 20,
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    paddingBottom: 12,
                    borderBottom: `1px solid ${COLORS.border}`,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                    }}
                >
                    <span
                        style={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: COLORS.text,
                            fontFamily: "Kanit, sans-serif",
                        }}
                    >
                        สรุปประเภทความเร่งด่วน
                    </span>

                    <Tooltip
                        title="จัดระดับความเร่งด่วนของพื้นที่จากคะแนน Overall Priority"
                    >
                        <InfoCircleOutlined
                            style={{
                                color: COLORS.muted,
                                fontSize: 13,
                                cursor: "help",
                            }}
                        />
                    </Tooltip>
                </div>

                <Text
                    style={{
                        fontSize: 12,
                        color: COLORS.secondary,
                    }}
                >
                    วิเคราะห์ {summary.total_reports_analyzed || 0} รายงาน
                    {" "}({days} วัน)
                </Text>
            </div>

            {/* Summary Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(3, minmax(0, 1fr))",
                    gap: 12,
                    paddingTop: 14,
                }}
            >
                {cards.map(({ key, value }) => {
                    const cfg = LEVEL_CONFIG[key];

                    return (
                        <div
                            key={key}
                            style={{
                                minHeight: 88,
                                background: cfg.bg,
                                border: `1px solid ${cfg.color}22`,
                                borderLeft:
                                    `3px solid ${cfg.color}`,
                                borderRadius: 8,
                                padding: "12px 14px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 18,
                                        color: cfg.color,
                                    }}
                                >
                                    {cfg.icon}
                                </span>

                                <span
                                    style={{
                                        fontSize: 11,
                                        color: COLORS.secondary,
                                    }}
                                >
                                    พื้นที่
                                </span>
                            </div>

                            <div
                                style={{
                                    marginTop: 4,
                                    fontSize: 25,
                                    lineHeight: 1.1,
                                    fontWeight: 700,
                                    color: cfg.color,
                                }}
                            >
                                {value}
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    marginTop: 4,
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: COLORS.text,
                                    }}
                                >
                                    {cfg.label}
                                </span>

                                <span
                                    style={{
                                        fontSize: 10,
                                        color: COLORS.secondary,
                                    }}
                                >
                                    ({cfg.subLabel})
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}