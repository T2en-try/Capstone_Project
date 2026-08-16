import { Row, Col, Space, Divider, Typography } from "antd";

import SummaryCards from "../components/admin-dashboard/SummaryCards";
import PriorityReports from "../components/admin-dashboard/PriorityReports";
import MapCard from "../components/admin-dashboard/MapCard";
import ReportBarChart from "../components/admin-dashboard/ReportChart";
import ReportPieChart from "../components/admin-dashboard/ReportPieChart";
import RecentReports from "../components/admin-dashboard/RecentReports";
import GridPrioritySummary from "../components/admin-dashboard/GridPrioritySummary";
import TopPriorityAreas from "../components/admin-dashboard/TopPriorityAreas";

import { priorityReports } from "../mock/priorityReports";
import { mapReports } from "../mock/mapReports";
import {
  reportTypeData,
  reportStatusData,
} from "../mock/chartData";
import { recentReports } from "../mock/recentReports";

const { Title, Text } = Typography;

export default function DashboardPage() {
  const summaryData = {
    totalReports: 128,
    pendingReports: 35,
    processingReports: 42,
    completedReports: 51,
  };

  return (
    <Space
      direction="vertical"
      size={20}
      style={{
        width: "100%",
      }}
    >
      {/* Summary */}
      <SummaryCards data={summaryData} />

      {/* Map + Priority */}
      <Row gutter={20} align="stretch">
        <Col xs={24} xl={17}>
          <MapCard reports={mapReports} />
        </Col>

        <Col xs={24} xl={7}>
          <PriorityReports reports={priorityReports} />
        </Col>
      </Row>

      {/* ─── CASP Section ─── */}
      <Divider orientation="left">
        <span style={{ fontSize: 16, fontWeight: 600 }}>
          🗺️ Community-Aware Spatial Priority (CASP)
        </span>
      </Divider>

      <Text type="secondary" style={{ fontSize: 13 }}>
        วิเคราะห์พื้นที่เร่งด่วนจากการแจ้งซ้ำของประชาชน รวมกับคะแนน AI (PPI)
        — Overall Priority = 0.8 × PPI + 0.2 × CUS
      </Text>

      {/* Grid Priority Summary Cards */}
      <GridPrioritySummary days={7} />

      {/* Top Priority Areas Table */}
      <TopPriorityAreas topN={5} />

      {/* Charts */}
      <Row gutter={20}>
        <Col xs={24} lg={12}>
          <ReportBarChart data={reportTypeData} />
        </Col>

        <Col xs={24} lg={12}>
          <ReportPieChart data={reportStatusData} />
        </Col>
      </Row>

      {/* Recent Reports */}
      <RecentReports reports={recentReports} />
    </Space>
  );
}