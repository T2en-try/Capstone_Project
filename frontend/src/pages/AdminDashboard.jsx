import { useEffect, useState } from "react";
import { Alert, Col, Divider, Row, Space, Spin, Typography } from "antd";

import SummaryCards from "../components/admin-dashboard/SummaryCards";
import PriorityReports from "../components/admin-dashboard/PriorityReports";
import MapCard from "../components/admin-dashboard/MapCard";
import ReportBarChart from "../components/admin-dashboard/ReportChart";
import ReportPieChart from "../components/admin-dashboard/ReportPieChart";
import RecentReports from "../components/admin-dashboard/RecentReports";
import GridPrioritySummary from "../components/admin-dashboard/GridPrioritySummary";
import TopPriorityAreas from "../components/admin-dashboard/TopPriorityAreas";
import RoadSegmentPriority from "../components/admin-dashboard/RoadSegmentPriority";

import {
  fetchDashboardStats,
  fetchMapPoints,
  fetchReports,
} from "../services/dashboardService";
import {
  getConfidencePercent,
  getPriorityLabel,
  getSeverityLabel,
  normalizePriorityClass,
} from "../utils/priorityMapping";
import { getReportStatus } from "../utils/statusHelper";

const { Title, Text } = Typography;

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsResult, reportsResult, pointsResult] = await Promise.all([
          fetchDashboardStats(),
          fetchReports(1, 100),
          fetchMapPoints(false),
        ]);

        if (!statsResult.success) {
          throw new Error(statsResult.error || "ไม่สามารถโหลดสถิติได้");
        }

        if (!reportsResult.success) {
          throw new Error(reportsResult.error || "ไม่สามารถโหลดรายงานได้");
        }

        if (!pointsResult.success) {
          throw new Error(pointsResult.error || "ไม่สามารถโหลดข้อมูลแผนที่ได้");
        }

        if (!active) return;

        const reports = reportsResult.data.reports;
        const stats = statsResult.data;
        const statusLabels = {
          pending: "Pending",
          processing: "Processing",
          completed: "Completed",
          rejected: "Rejected",
        };
        const getLocation = (report) =>
          report.ai_analysis?.road_name ||
          (report.latitude != null && report.longitude != null
            ? `${report.latitude}, ${report.longitude}`
            : "ไม่ระบุพิกัด");

        const recentReports = reports.map((report) => ({
          key: report.id,
          id: report.id,
          description: report.description || "ไม่มีรายละเอียด",
          location: getLocation(report),
          severity: getSeverityLabel(report.ai_analysis?.priority_class),
          priorityClass: normalizePriorityClass(report.ai_analysis?.priority_class),
          priorityLabel: getPriorityLabel(report.ai_analysis?.priority_class),
          priorityScore: report.ai_analysis?.final_fusion_score ?? null,
          confidence: getConfidencePercent(report.ai_analysis?.confidence_score),
          rejectionReason: report.rejection_reason,
          probaNormal: report.ai_analysis?.proba_normal,
          probaWarning: report.ai_analysis?.proba_warning,
          probaCritical: report.ai_analysis?.proba_critical,
          status: statusLabels[report.status] || report.status || "Unknown",
          reporter: report.reporter_name || "ไม่ระบุชื่อ",
          createdAt: new Date(report.created_at).toLocaleString("th-TH"),
        }));

        // Priority Reports: ดึงเฉพาะรายงานที่ผ่าน AI แล้ว (status=completed)
        const priorityReports = reports
          .filter((r) => r.status === "completed")
          .map((report) => ({
            id: report.id,
            title: report.description || `รายงาน #${report.id}`,
            location: getLocation(report),
            severity: getSeverityLabel(report.ai_analysis?.priority_class),
            priorityClass: normalizePriorityClass(report.ai_analysis?.priority_class),
            priorityLabel: getPriorityLabel(report.ai_analysis?.priority_class),
            priorityScore: report.ai_analysis?.final_fusion_score ?? null,
            confidence: getConfidencePercent(report.ai_analysis?.confidence_score),
            probaNormal: report.ai_analysis?.proba_normal,
            probaWarning: report.ai_analysis?.proba_warning,
            probaCritical: report.ai_analysis?.proba_critical,
            priorityStatus: getReportStatus(report),
          }));

        const mapReports = pointsResult.data.points.map((point) => ({
          id: point.id,
          title: point.road_name || `รายงาน #${point.id}`,
          location: point.road_name || `${point.latitude}, ${point.longitude}`,
          latitude: point.latitude,
          longitude: point.longitude,
          severity: getSeverityLabel(point.priority_class),
          priorityClass: normalizePriorityClass(point.priority_class),
          priorityLabel: getPriorityLabel(point.priority_class),
          confidence: getConfidencePercent(point.confidence_score),
          probaNormal: point.proba_normal,
          probaWarning: point.proba_warning,
          probaCritical: point.proba_critical,
          status: point.status,
        }));

        setDashboardData({
          summary: {
            totalReports: stats.total_reports,
            pendingReports: stats.pending_count,
            processingReports: stats.processing_count,
            completedReports: stats.completed_count,
            rejectedReports: stats.rejected_count,
          },
          mapReports,
          priorityReports,
          recentReports,
          statusChart: [
            { name: "Pending", count: stats.pending_count },
            { name: "Processing", count: stats.processing_count },
            { name: "Completed", count: stats.completed_count },
            { name: "Rejected", count: stats.rejected_count },
          ],
          statusPie: [
            { name: "Pending", value: stats.pending_count },
            { name: "Processing", value: stats.processing_count },
            { name: "Completed", value: stats.completed_count },
            { name: "Rejected", value: stats.rejected_count },
          ],
        });
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <Spin tip="กำลังโหลดข้อมูล Dashboard..." size="large" />;
  }

  if (error) {
    return <Alert type="error" showIcon message="ไม่สามารถโหลด Dashboard ได้" description={error} />;
  }

  if (!dashboardData) return null;

  return (
    <Space
      direction="vertical"
      size={20}
      style={{
        width: "100%",
      }}
    >
      {/* Summary */}
      <SummaryCards data={dashboardData.summary} />

      {/* Map + Priority */}
      <Row gutter={20} align="stretch">
        <Col xs={24} xl={17}>
          <MapCard reports={dashboardData.mapReports} />
        </Col>

        <Col xs={24} xl={7}>
          <PriorityReports reports={dashboardData.priorityReports} />
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

      <RoadSegmentPriority />

      {/* Charts */}
      <Row gutter={20}>
        <Col xs={24} lg={12}>
          <ReportBarChart data={dashboardData.statusChart} title="Report By Status" />
        </Col>

        <Col xs={24} lg={12}>
          <ReportPieChart data={dashboardData.statusPie} />
        </Col>
      </Row>

      {/* Recent Reports */}
      <RecentReports reports={dashboardData.recentReports} />
    </Space>
  );
}