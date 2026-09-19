import React from "react";
import { Card, Statistic } from "antd";

import {
    FileTextOutlined,
    ClockCircleOutlined,
    ToolOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
} from "@ant-design/icons";

export default function StatusCard({
    stats = {},
    loading = false,
}) {
    const defaultStats = {
        total_reports: 0,
        pending_count: 0,
        processing_count: 0,
        completed_count: 0,
        rejected_count: 0,
    };

    const data = {
        ...defaultStats,
        ...stats,
    };

    const statusItems = [
        {
            key: "pending",
            title: "Pending",
            description: "Awaiting review",
            value: Number(data.pending_count) || 0,
            icon: <ClockCircleOutlined />,
            color: "#DC2626",
            background: "#FEF2F2",
        },
        {
            key: "processing",
            title: "In Progress",
            description: "Currently being repaired",
            value: Number(data.processing_count) || 0,
            icon: <ToolOutlined />,
            color: "#F59E0B",
            background: "#FFFBEB",
        },
        {
            key: "completed",
            title: "Completed",
            description: "Repair completed",
            value: Number(data.completed_count) || 0,
            icon: <CheckCircleOutlined />,
            color: "#16A34A",
            background: "#F0FDF4",
        },
        {
            key: "rejected",
            title: "Rejected",
            description: "Did not pass review",
            value: Number(data.rejected_count) || 0,
            icon: <ExclamationCircleOutlined />,
            color: "#64748B",
            background: "#F1F5F9",
        },
    ];

    return (
        <section className="w-full">

            {/* =================================================
                Header
            ================================================= */}

            <header className="mb-4">
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                            Report Status
                        </h2>

                        <p className="mt-0.5 text-xs text-slate-400">
                            Overview of all road reports
                        </p>
                    </div>

                    <div className="hidden items-center gap-1.5 text-[11px] text-slate-400 sm:flex">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Live system data
                    </div>
                </div>
            </header>

            {/* =================================================
                Status Cards
            ================================================= */}

            <div
                className="
                    flex
                    snap-x
                    snap-mandatory
                    gap-3
                    overflow-x-auto
                    pb-1
                    -mx-4
                    px-4

                    sm:mx-0
                    sm:grid
                    sm:grid-cols-2
                    sm:px-0

                    hide-scrollbar
                "
            >
                {statusItems.map((item) => (
                    <div
                        key={item.key}
                        className="
                            min-w-[85%]
                            shrink-0
                            snap-center

                            sm:min-w-0
                        "
                    >
                        <Card
                            size="small"
                            loading={loading}
                            bordered
                            hoverable
                            styles={{
                                body: {
                                    padding: "14px 16px",
                                },
                            }}
                            style={{
                                height: "100%",
                                borderColor: "#E5E7EB",
                                borderRadius: 12,
                                background: "#FFFFFF",
                                transition: "all 0.2s ease",
                            }}
                        >
                            <div className="flex items-center justify-between gap-3">

                                {/* =================================================
                                    Left
                                ================================================= */}

                                <div className="flex min-w-0 items-center gap-3">

                                    {/* Icon */}

                                    <div
                                        className="
                                            flex
                                            h-10
                                            w-10
                                            shrink-0
                                            items-center
                                            justify-center
                                            rounded-xl
                                        "
                                        style={{
                                            backgroundColor:
                                                item.background,
                                            color: item.color,
                                            fontSize: 19,
                                        }}
                                    >
                                        {item.icon}
                                    </div>

                                    {/* Text */}

                                    <div className="min-w-0">
                                        <div
                                            className="
                                                truncate
                                                text-sm
                                                font-semibold
                                                text-slate-800
                                            "
                                        >
                                            {item.title}
                                        </div>

                                        <div
                                            className="
                                                mt-0.5
                                                truncate
                                                text-[11px]
                                                text-slate-400
                                            "
                                        >
                                            {item.description}
                                        </div>
                                    </div>
                                </div>

                                {/* Number */}

                                <Statistic
                                    value={item.value}
                                    valueStyle={{
                                        color: item.color,
                                        fontSize: 24,
                                        fontWeight: 700,
                                        lineHeight: 1,
                                        fontFamily:
                                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                                    }}
                                />
                            </div>
                        </Card>
                    </div>
                ))}
            </div>

            {/* =================================================
                Hide Scrollbar
            ================================================= */}

            <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }

                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            {/* =================================================
                Total Reports
            ================================================= */}

            <Card
                size="small"
                bordered
                style={{
                    marginTop: 12,
                    borderColor: "#DBEAFE",
                    borderRadius: 12,
                    background: "#F8FAFC",
                }}
                styles={{
                    body: {
                        padding: "13px 16px",
                    },
                }}
            >
                <div className="flex items-center justify-between gap-4">

                    {/* Left */}

                    <div className="flex min-w-0 items-center gap-3">

                        <div
                            className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                bg-blue-50
                                text-blue-600
                            "
                            style={{
                                fontSize: 18,
                            }}
                        >
                            <FileTextOutlined />
                        </div>

                        <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-800">
                                Total Reports
                            </div>

                            <div className="mt-0.5 text-[11px] text-slate-400">
                                Total number of reports in the system
                            </div>
                        </div>
                    </div>

                    {/* Total */}

                    <div className="flex shrink-0 items-baseline gap-2">
                        <span
                            className="
                                font-mono
                                text-2xl
                                font-bold
                                text-blue-600
                            "
                        >
                            {Number(data.total_reports) || 0}
                        </span>

                        <span className="text-[11px] text-slate-400">
                            reports
                        </span>
                    </div>
                </div>
            </Card>
        </section>
    );
}