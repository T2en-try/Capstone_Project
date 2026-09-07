import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Col, Row, Space, Spin, Typography, Tabs } from "antd";

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
import { fetchDashboardStats, fetchReports } from "../services/dashboardService";
import { getPriorityLabel, normalizePriorityClass } from "../utils/priorityMapping";

const { Title, Text } = Typography;

const PriorityReportsPage = () => {
    const [activeTab, setActiveTab] = useState("reports");
    const [reports, setReports] = useState([]);
    const [stats, setStats] = useState(null);
    const [filters, setFilters] = useState({
        keyword: "",
        status: "all",
        priority: "all",
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadReports = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [statsResult, reportsResult] = await Promise.all([
                fetchDashboardStats(),
                fetchReports(1, 100),
            ]);

            if (!statsResult.success) {
                throw new Error(statsResult.error || "ไม่สามารถโหลดสถิติได้");
            }
            if (!reportsResult.success) {
                throw new Error(reportsResult.error || "ไม่สามารถโหลดรายงานได้");
            }

            setStats(statsResult.data);
            setReports(reportsResult.data.reports);
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const getPriority = (report) => {
        const priorityClass = normalizePriorityClass(report.ai_analysis?.priority_class);
        return priorityClass ? getPriorityLabel(priorityClass) : "ยังไม่มีผลวิเคราะห์";
    };

    const filteredReports = reports.filter((report) => {
        const roadName = report.ai_analysis?.road_name || "";
        const keyword = filters.keyword.trim().toLowerCase();
        const matchesKeyword = !keyword || [
            report.id,
            report.description,
            report.reporter_name,
            roadName,
        ].some((value) => String(value || "").toLowerCase().includes(keyword));
        const matchesStatus =
            filters.status === "all" || report.status === filters.status;
        const matchesPriority =
            filters.priority === "all" || getPriority(report) === filters.priority;
        return matchesKeyword && matchesStatus && matchesPriority;
    });

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
                        <SummaryCards stats={stats} loading={loading} />
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
                        <FilterBar
                            filters={filters}
                            onChange={setFilters}
                        />

                        {/* Table */}
                        <div style={{ marginTop: 24 }}>
                            <ReportsTable reports={filteredReports} loading={loading} />
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
                            <Button icon={<ReloadOutlined />} onClick={loadReports} loading={loading}>Refresh</Button>
                            <Button type="primary" icon={<DownloadOutlined />}>
                                Export
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* ================= Tabs: Reports / Grid ================= */}
            {error && (
                <Alert
                    type="error"
                    showIcon
                    message="ไม่สามารถโหลดข้อมูล Priority Reports ได้"
                    description={error}
                    style={{ marginBottom: 20 }}
                />
            )}

            {loading && !stats ? (
                <Spin tip="กำลังโหลดข้อมูลจากฐานข้อมูล..." size="large" />
            ) : <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="large"
                style={{ background: "transparent" }}
            />}
        </div>
    );
};

export default PriorityReportsPage;
