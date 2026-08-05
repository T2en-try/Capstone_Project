import { Button, Card, Col, Row, Space, Typography } from "antd";

import {
    DownloadOutlined,
    ReloadOutlined,
    WarningOutlined,
} from "@ant-design/icons";

import SummaryCards from "../components/admin-priority/SummaryCards";
import FilterBar from "../components/admin-priority/FilterBar";
import ReportsTable from "../components/admin-priority/ReportsTable";

const { Title, Text } = Typography;

const PriorityReportsPage = () => {
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
                                <Title
                                    level={2}
                                    style={{
                                        margin: 0,
                                    }}
                                >
                                    Priority Reports
                                </Title>

                                <Text type="secondary">
                                    Manage and monitor road damage reports
                                    ranked by AI priority score
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
    <Title
        level={4}
        style={{
            margin: 0,
        }}
    >
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

                <div
                    style={{
                        marginTop: 24,
                    }}
                >
                    <ReportsTable />
                </div>
            </Card>
        </div>
    );
};

export default PriorityReportsPage;
