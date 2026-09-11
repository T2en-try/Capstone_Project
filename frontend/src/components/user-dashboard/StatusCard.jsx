import React from "react";
import {
    Card,
    Col,
    Row,
    Statistic,
    ConfigProvider,
} from "antd";

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
            title: "รอดำเนินการ",
            description: "รอการตรวจสอบ",
            value: Number(data.pending_count) || 0,
            icon: <ClockCircleOutlined />,
            color: "#C45C4A",
            background: "#F8EDEA",
        },
        {
            key: "processing",
            title: "กำลังดำเนินการ",
            description: "อยู่ระหว่างการซ่อม",
            value: Number(data.processing_count) || 0,
            icon: <ToolOutlined />,
            color: "#C4891A",
            background: "#F8F2E3",
        },
        {
            key: "completed",
            title: "ซ่อมเสร็จแล้ว",
            description: "ดำเนินการเสร็จสิ้น",
            value: Number(data.completed_count) || 0,
            icon: <CheckCircleOutlined />,
            color: "#2D7A5F",
            background: "#EAF3EF",
        },
        {
            key: "rejected",
            title: "ปฏิเสธ",
            description: "ไม่ผ่านการตรวจสอบ",
            value: Number(data.rejected_count) || 0,
            icon: <ExclamationCircleOutlined />,
            color: "#6D7773",
            background: "#EEF1F0",
        },
    ];

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#E6A817",
                    colorText: "#14352F",
                    colorTextSecondary: "#6B7773",
                    colorBorder: "#C5D4CF",
                    borderRadius: 12,
                },
            }}
        >
            <section className="w-full">

                {/* Header */}
                <header className="mb-4">
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <h2 className="font-display text-lg font-semibold text-ink">
                                สถานะรายงาน
                            </h2>

                            <p className="mt-0.5 text-xs text-asphalt/55">
                                ภาพรวมการดำเนินงานของรายงานทั้งหมด
                            </p>
                        </div>

                        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-asphalt/45">
                            <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                            อัปเดตจากระบบ
                        </div>
                    </div>
                </header>

                {/* Status Cards */}
                <Row gutter={[12, 12]}>
                    {statusItems.map((item) => (
                        <Col
                            key={item.key}
                            xs={24}
                            sm={12}
                        >
                            <Card
                                size="small"
                                loading={loading}
                                bordered
                                styles={{
                                    body: {
                                        padding: "14px 16px",
                                    },
                                }}
                                style={{
                                    height: "100%",
                                    borderColor: "#C5D4CF",
                                    borderRadius: 12,
                                    background: "#F7FAF8",
                                    transition: "all 0.2s ease",
                                }}
                                hoverable
                            >
                                <div className="flex items-center justify-between gap-3">

                                    {/* Left */}
                                    <div className="flex min-w-0 items-center gap-3">

                                        {/* Icon */}
                                        <div
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                                            style={{
                                                backgroundColor: item.background,
                                                color: item.color,
                                                fontSize: 19,
                                            }}
                                        >
                                            {item.icon}
                                        </div>

                                        {/* Text */}
                                        <div className="min-w-0">
                                            <div
                                                className="truncate text-sm font-semibold"
                                                style={{
                                                    color: "#14352F",
                                                }}
                                            >
                                                {item.title}
                                            </div>

                                            <div
                                                className="mt-0.5 truncate text-[11px]"
                                                style={{
                                                    color: "#6B7773",
                                                }}
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
                        </Col>
                    ))}
                </Row>

                {/* Total Reports */}
                <Card
                    size="small"
                    bordered
                    style={{
                        marginTop: 12,
                        borderColor: "rgba(230, 168, 23, 0.35)",
                        borderRadius: 12,
                        background: "rgba(230, 168, 23, 0.05)",
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
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                                style={{
                                    background: "rgba(230, 168, 23, 0.10)",
                                    color: "#C48A0A",
                                    fontSize: 18,
                                }}
                            >
                                <FileTextOutlined />
                            </div>

                            <div className="min-w-0">
                                <div className="text-sm font-semibold text-ink">
                                    รายงานทั้งหมด
                                </div>

                                <div className="mt-0.5 text-[11px] text-asphalt/50">
                                    จำนวนรายงานที่อยู่ในระบบ
                                </div>
                            </div>
                        </div>

                        {/* Total */}
                        <div className="flex items-baseline gap-2 shrink-0">
                            <span
                                className="font-mono text-2xl font-bold"
                                style={{
                                    color: "#C48A0A",
                                }}
                            >
                                {Number(data.total_reports) || 0}
                            </span>

                            <span className="text-[11px] text-asphalt/45">
                                รายการ
                            </span>
                        </div>
                    </div>
                </Card>
            </section>
        </ConfigProvider>
    );
}