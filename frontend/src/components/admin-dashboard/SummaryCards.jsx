import { Card, Col, Row, Statistic, Tag } from "antd";

import {
    FileSearchOutlined,
    ClockCircleOutlined,
    SyncOutlined,
    CheckCircleOutlined,
    ArrowUpOutlined,
} from "@ant-design/icons";

const SummaryCards = ({ data }) => {
    const cards = [
        {
            title: "รายงานทั้งหมด",
            value: data.totalReports,
            icon: <FileSearchOutlined />,
            color: "#1677ff",
            bg: "#e6f4ff",
            status: "Total",
        },

        {
            title: "รอตรวจสอบ",
            value: data.pendingReports,
            icon: <ClockCircleOutlined />,
            color: "#faad14",
            bg: "#fffbe6",
            status: "Pending",
        },

        {
            title: "กำลังดำเนินการ",
            value: data.processingReports,
            icon: <SyncOutlined />,
            color: "#722ed1",
            bg: "#f9f0ff",
            status: "Processing",
        },

        {
            title: "ซ่อมเสร็จแล้ว",
            value: data.completedReports,
            icon: <CheckCircleOutlined />,
            color: "#52c41a",
            bg: "#f6ffed",
            status: "Completed",
        },
    ];

    return (
        <Row gutter={[16, 16]}>
            {cards.map((card) => (
                <Col key={card.title} xs={24} sm={12} lg={6}>
                    <Card
                        hoverable
                        style={{
                            borderRadius: 14,

                            height: 150,
                        }}
                        bodyStyle={{
                            padding: "16px 18px",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",

                                justifyContent: "space-between",

                                alignItems: "center",
                            }}
                        >
                            <div
                                style={{
                                    width: 42,

                                    height: 42,

                                    borderRadius: 10,

                                    background: card.bg,

                                    color: card.color,

                                    display: "flex",

                                    alignItems: "center",

                                    justifyContent: "center",

                                    fontSize: 20,
                                }}
                            >
                                {card.icon}
                            </div>

                            <Tag
                                color={card.color}
                                style={{
                                    margin: 0,

                                    fontSize: 11,
                                }}
                            >
                                {card.status}
                            </Tag>
                        </div>

                        <Statistic
                            title={card.title}
                            value={card.value}
                            valueStyle={{
                                fontSize: 26,

                                fontWeight: 700,

                                lineHeight: 1.2,

                                marginTop: 8,
                            }}
                        />

                        <div
                            style={{
                                marginTop: 4,

                                fontSize: 12,

                                color: "#52c41a",
                            }}
                        >
                            <ArrowUpOutlined /> 12% เดือนนี้
                        </div>
                    </Card>
                </Col>
            ))}
        </Row>
    );
};

export default SummaryCards;
