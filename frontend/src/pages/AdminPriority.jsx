import { useState } from "react";
import { Button, Card, Col, Row, Space, Typography, Tabs } from "antd";

import {
    DownloadOutlined,
    ReloadOutlined,
    WarningOutlined,
    AppstoreOutlined,
} from "@ant-design/icons";

import SummaryCards from "../components/admin-priority/SummaryCards";
import FilterBar from "../components/admin-priority/FilterBar";
import ReportsTable from "../components/admin-priority/ReportsTable";
import GridPriorityTable from "../components/admin-priority/GridPriorityTable";

const { Title, Text } = Typography;

const PriorityReportsPage = () => {
    const [activeTab, setActiveTab] = useState("reports");

    const tabItems = [
        {
            key: "reports",
            label: (
                <span>
                    <WarningOutlined style={{ color: "#ff4d4f", marginRight: 6 }} />
                    Priority Reports (AI)
                </span>
            ),
            children: (
                <div>
                    {/* ================= Summary ================= */}
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: 16,
                            marginBottom: 20,
                        }}
                    >
                        <SummaryCards />
                    </Card>

                    {/* ================= Report Table ================= */}
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: 16,
                        }}
                        bodyStyle={{
                            padding: 24,
                        }}
                    >
                        <Row
                            justify="space-between"
                            align="middle"
                            style={{
                                marginBottom: 20,
                            }}
                        >
                            <Col>
                                <Title level={4} style={{ margin: 0 }}>
                                    รายงานปัญหาถนน
                                </Title>
                                <Text type="secondary">
                                    ตรวจสอบ วิเคราะห์ และจัดการรายงานความเสียหายของถนนจากผู้ใช้งาน
                                </Text>
                            </Col>
                        </Row>

                        {/* Filter */}
                        <FilterBar />

                        {/* Table */}
                        <div style={{ marginTop: 24 }}>
                            <ReportsTable />
                        </div>
                    </Card>
                </div>
            ),
        },
        {
            key: "grid",
            label: (
                <span>
                    <AppstoreOutlined style={{ color: "#13c2c2", marginRight: 6 }} />
                    Grid Priority (CASP)
                </span>
            ),
            children: (
                <Card
                    bordered={false}
                    style={{
                        borderRadius: 16,
                    }}
                    bodyStyle={{
                        padding: 24,
                    }}
                >
                    <div style={{ marginBottom: 16 }}>
                        <Title level={4} style={{ margin: 0 }}>
                            จัดอันดับพื้นที่ตาม Overall Priority
                        </Title>
                        <Text type="secondary">
                            Overall Priority = 0.8 × PPI (AI) + 0.2 × CUS (Community Urgency Score)
                            &nbsp;|&nbsp; Recency: R(t) = e⁻ᵗ/³⁰ &nbsp;|&nbsp; Grid ≈ 100×100 เมตร
                        </Text>
                    </div>
                    <GridPriorityTable />
                </Card>
            ),
        },
    ];

    return (
        <div
            style={{
                padding: 24,
                background: "#f5f7fa",
                minHeight: "100vh",
            }}
        >
            {/* ================= Header ================= */}
            <Card
                bordered={false}
                style={{
                    borderRadius: 16,
                    marginBottom: 20,
                }}
            >
                <Row justify="space-between" align="middle">
                    <Col>
                        <Space align="start">
                            <WarningOutlined
                                style={{
                                    fontSize: 32,
                                    color: "#ff4d4f",
                                    marginTop: 6,
                                }}
                            />

                            <div>
                                <Title level={2} style={{ margin: 0 }}>
                                    Priority Reports
                                </Title>

                                <Text type="secondary">
                                    Manage and monitor road damage reports ranked by AI priority score &amp; Community Urgency
                                </Text>
                            </div>
                        </Space>
                    </Col>

                    <Col>
                        <Space>
                            <Button icon={<ReloadOutlined />}>Refresh</Button>
                            <Button type="primary" icon={<DownloadOutlined />}>
                                Export
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* ================= Tabs: Reports / Grid ================= */}
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="large"
                style={{ background: "transparent" }}
            />
        </div>
    );
};

export default PriorityReportsPage;
