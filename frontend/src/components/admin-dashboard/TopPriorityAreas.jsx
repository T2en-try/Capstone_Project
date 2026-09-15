/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import {
    Spin,
    Skeleton,
    Typography,
    Table,
    Tooltip,
    Badge,
    Button,
    Select,
    Space,
    Progress,
} from "antd";

import {
    TrophyOutlined,
    FireOutlined,
    WarningOutlined,
    CheckCircleOutlined,
    InfoCircleOutlined,
    ReloadOutlined,
} from "@ant-design/icons";

import { fetchGridPriority } from "../../services/analyticsService";

const { Text } = Typography;

/* =========================================================
   UI Colors
========================================================= */

const COLORS = {
    text: "#1F2937",
    secondary: "#64748B",
    muted: "#94A3B8",
    border: "#E5E7EB",

    primary: "#2563EB",

    critical: "#DC2626",
    criticalSoft: "#FEF2F2",

    high: "#F59E0B",
    highSoft: "#FFFBEB",

    low: "#16A34A",
    lowSoft: "#F0FDF4",
};

/* =========================================================
   CASP Level Config
   มี 3 ระดับเท่านั้น
========================================================= */

const LEVEL_CONFIG = {
    critical: {
        color: COLORS.critical,
        label: "เร่งด่วน",
        subLabel: "Critical",
        icon: <FireOutlined />,
    },

    high: {
        color: COLORS.high,
        label: "สูง",
        subLabel: "High",
        icon: <WarningOutlined />,
    },

    low: {
        color: COLORS.low,
        label: "ต่ำ",
        subLabel: "Low",
        icon: <CheckCircleOutlined />,
    },
};

/* =========================================================
   Date Options
========================================================= */

const DAY_OPTIONS = [
    {
        label: "7 วัน",
        value: 7,
    },
    {
        label: "14 วัน",
        value: 14,
    },
    {
        label: "30 วัน",
        value: 30,
    },
];

/* =========================================================
   Top Priority Areas
========================================================= */

export default function TopPriorityAreas({ topN = 5 }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(7);

    /* =======================================================
       Load Data
    ======================================================= */

    const load = () => {
        setLoading(true);

        fetchGridPriority(days)
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, [days]);

    /* =======================================================
       Top Grids
    ======================================================= */

    const topGrids =
        data?.grids?.slice(0, topN) ?? [];

    /* =======================================================
       Table Columns
    ======================================================= */

    const columns = [
        /* ---------------------------------------------------
           Rank
        --------------------------------------------------- */

        {
            title: "#",
            width: 45,

            render: (_, __, index) => {
                let color = COLORS.secondary;

                if (index === 0) {
                    color = COLORS.critical;
                } else if (index === 1) {
                    color = COLORS.high;
                }

                return (
                    <span
                        style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color,
                        }}
                    >
                        {index + 1}
                    </span>
                );
            },
        },

        /* ---------------------------------------------------
           Grid ID
        --------------------------------------------------- */

        {
            title: "Grid ID",
            dataIndex: "grid_id",

            render: (value) => (
                <Text
                    code
                    style={{
                        fontSize: 11,
                        color: COLORS.text,
                    }}
                >
                    {value}
                </Text>
            ),
        },

        /* ---------------------------------------------------
           Reports
        --------------------------------------------------- */

        {
            title: `รายงาน (${days} วัน)`,
            dataIndex: "report_count",
            align: "center",

            render: (value) => (
                <Badge
                    count={value}
                    color={COLORS.primary}
                    overflowCount={999}
                    showZero
                />
            ),
        },

        /* ---------------------------------------------------
           AI
        --------------------------------------------------- */

        {
            title: (
                <Tooltip title="คะแนนจากการวิเคราะห์ AI">
                    <span>AI</span>
                </Tooltip>
            ),

            dataIndex: "avg_ppi",
            align: "center",

            render: (value) => (
                <span
                    style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: COLORS.text,
                    }}
                >
                    {Number(value || 0).toFixed(0)}
                </span>
            ),
        },

        /* ---------------------------------------------------
           CUS
        --------------------------------------------------- */

        {
            title: (
                <Tooltip title="คะแนนความเร่งด่วนจากประชาชน">
                    <span>CUS (ประชาชน)</span>
                </Tooltip>
            ),

            dataIndex: "cus",
            align: "center",

            render: (value) => (
                <span
                    style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#7C3AED",
                    }}
                >
                    {Number(value || 0).toFixed(0)}
                </span>
            ),
        },

        /* ---------------------------------------------------
           Overall Priority
        --------------------------------------------------- */

        {
            title: "Overall Priority",
            dataIndex: "overall_priority",
            align: "center",
            width: 280,

            render: (value, row) => {
                const level =
                    LEVEL_CONFIG[row.priority_level] ||
                    LEVEL_CONFIG.low;

                const priority = Number(value || 0);

                return (
                    <div
                        style={{
                            width: "100%",
                            padding: "0 8px",
                        }}
                    >
                        <Progress
                            percent={Math.min(
                                Math.max(priority, 0),
                                100
                            )}
                            size="small"
                            strokeColor={level.color}
                            trailColor="#E5E7EB"
                            format={() => (
                                <span
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: level.color,
                                    }}
                                >
                                    {priority.toFixed(0)}
                                </span>
                            )}
                        />

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 5,
                                marginTop: 3,
                            }}
                        >
                            <span
                                style={{
                                    color: level.color,
                                    fontSize: 11,
                                }}
                            >
                                {level.icon}
                            </span>

                            <span
                                style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: COLORS.text,
                                }}
                            >
                                {level.label}
                            </span>

                            <span
                                style={{
                                    fontSize: 10,
                                    color: COLORS.secondary,
                                }}
                            >
                                ({level.subLabel})
                            </span>
                        </div>
                    </div>
                );
            },
        },
    ];

    /* =======================================================
       Render
    ======================================================= */

    return (
        <section
            style={{
                width: "100%",
                marginBottom: 20,
            }}
        >
            {/* =================================================
                Header
            ================================================= */}

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
                {/* Title */}

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                    }}
                >
                    <TrophyOutlined
                        style={{
                            color: COLORS.high,
                            fontSize: 16,
                        }}
                    />

                    <span
                        style={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: COLORS.text,
                            fontFamily:
                                "Kanit, sans-serif",
                        }}
                    >
                        พื้นที่เร่งด่วนสูงสุด
                    </span>

                    <Tooltip
                        title="จัดอันดับพื้นที่ตาม Overall Priority"
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

                {/* Controls */}

                <Space size={8}>
                    <Select
                        size="small"
                        value={days}
                        options={DAY_OPTIONS}
                        onChange={setDays}
                        style={{
                            width: 90,
                        }}
                    />

                    <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={load}
                        loading={loading}
                        style={{
                            width: 32,
                            height: 28,
                            padding: 0,
                            borderColor: COLORS.border,
                        }}
                    />
                </Space>
            </div>

            {/* =================================================
                Table
            ================================================= */}

            <div
                style={{
                    paddingTop: 12,
                }}
            >
                {loading ? (
                    <div className="py-4 px-2 space-y-4">
                        <Skeleton active paragraph={{ rows: 1 }} />
                        <Skeleton active paragraph={{ rows: 1 }} />
                        <Skeleton active paragraph={{ rows: 1 }} />
                    </div>
                ) : (
                    <>
                        {/* ── Desktop View (Table) ── */}
                        <div className="hidden md:block">
                            <Table
                                dataSource={topGrids}
                                columns={columns}
                                rowKey="grid_id"
                                pagination={false}
                                size="small"
                                scroll={{
                                    x: 900,
                                }}
                                locale={{
                                    emptyText:
                                        "ไม่มีข้อมูลในพื้นที่ศึกษา",
                                }}
                            />
                        </div>

                        {/* ── Mobile View (Card List) ── */}
                        <div className="block md:hidden space-y-4 pt-2">
                            {topGrids.length === 0 ? (
                                <div className="text-center text-asphalt/50 py-4">ไม่มีข้อมูลในพื้นที่ศึกษา</div>
                            ) : (
                                topGrids.map((grid, idx) => {
                                    const lvlConf = LEVEL_CONFIG[grid.casp_priority_level || "low"];
                                    
                                    return (
                                        <div key={grid.grid_id} className="border border-line rounded-xl p-4 bg-white flex flex-col gap-3 shadow-sm">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-display text-xl font-bold" style={{ color: idx === 0 ? COLORS.critical : idx === 1 ? COLORS.high : COLORS.secondary }}>#{idx + 1}</span>
                                                    <span className="font-semibold text-ink text-sm">Grid: {grid.grid_id}</span>
                                                </div>
                                                <Badge
                                                    color={lvlConf.color}
                                                    text={lvlConf.label}
                                                    style={{ fontWeight: 600, color: lvlConf.color }}
                                                />
                                            </div>
                                            
                                            <div className="flex flex-col gap-1 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-asphalt/70">รวมความเสียหาย:</span>
                                                    <span className="font-semibold">{grid.total_reports} รายการ</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-asphalt/70">คะแนน CASP:</span>
                                                    <span className="font-semibold">{Number(grid.casp_priority_score).toFixed(2)}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-1 pt-3 border-t border-line/50 flex justify-between items-center text-xs">
                                                <span className="text-danger flex items-center gap-1">
                                                    <FireOutlined /> เร่งด่วน ({grid.breakdown?.critical || 0})
                                                </span>
                                                <span className="text-high flex items-center gap-1">
                                                    <WarningOutlined /> สูง ({grid.breakdown?.high || 0})
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* =================================================
                Footer
            ================================================= */}

            {data && !loading && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        paddingTop: 8,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 12,
                            color: COLORS.secondary,
                        }}
                    >
                        รวม{" "}
                        <strong
                            style={{
                                color: COLORS.text,
                            }}
                        >
                            {data.total_grids_with_reports || 0}
                        </strong>{" "}
                        พื้นที่ที่มี Report
                    </Text>
                </div>
            )}
        </section>
    );
}