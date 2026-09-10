import { Card, Col, Row, Statistic } from "antd";

import {
    FileTextOutlined,
    ClockCircleOutlined,
    SyncOutlined,
    CheckCircleOutlined,
} from "@ant-design/icons";
import { getReportStatus } from "../../utils/statusHelper";

const SummaryCards = ({ stats = {}, reports = [], loading = false }) => {
    // คำนวณสถิติจาก actions ล่าสุด (road_actions) ของรายงานที่ผ่าน AI แล้ว
    const priorityCounts = reports.reduce(
        (acc, r) => {
            const ps = getReportStatus(r);
            acc[ps] = (acc[ps] || 0) + 1;
            return acc;
        },
        { pending: 0, processing: 0, completed: 0 }
    );

    const cards = [
        {
            title: "รายงานทั้งหมด",

            value: reports.length || stats.total_reports || 0,

            icon: <FileTextOutlined />,

            color: "#1677ff",

            bg: "#e6f4ff",
        },

        {
            title: "รอดำเนินการ",

            value: priorityCounts.pending,

            icon: <ClockCircleOutlined />,

            color: "#faad14",

            bg: "#fffbe6",
        },

        {
            title: "กำลังดำเนินการ",

            value: priorityCounts.processing,

            icon: <SyncOutlined spin />,

            color: "#13c2c2",

            bg: "#e6fffb",
        },

        {
            title: "ดำเนินการเสร็จสิ้น",

            value: priorityCounts.completed,

            icon: <CheckCircleOutlined />,

            color: "#52c41a",

            bg: "#f6ffed",
        },
    ];

    if (loading) {
        return <div>กำลังโหลดสถิติ...</div>;
    }

    return (
        <Row gutter={[16, 16]}>
            {cards.map((card) => (
                <Col xs={24} sm={12} lg={6} key={card.title}>
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: 16,

                            height: "100%",

                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        }}
                        bodyStyle={{
                            padding: 20,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",

                                alignItems: "center",

                                gap: 16,
                            }}
                        >
                            {/* Icon */}

                            <div
                                style={{
                                    width: 52,

                                    height: 52,

                                    borderRadius: 14,

                                    background: card.bg,

                                    color: card.color,

                                    display: "flex",

                                    justifyContent: "center",

                                    alignItems: "center",

                                    fontSize: 26,
                                }}
                            >
                                {card.icon}
                            </div>

                            {/* Statistic */}

                            <Statistic
                                title={card.title}
                                value={card.value}
                                valueStyle={{
                                    fontSize: 30,

                                    fontWeight: 700,
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
