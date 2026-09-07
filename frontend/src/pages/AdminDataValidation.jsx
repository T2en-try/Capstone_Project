import { useEffect, useMemo, useState } from "react";
import { Alert, Col, Row, Spin } from "antd";

import SummaryCards from "../components/admin-datavalidation/SummaryCards";
import VerificationFilter from "../components/admin-datavalidation/VerificationFilter";
import VerificationTable from "../components/admin-datavalidation/VerificationTable";
import AccuracyChart from "../components/admin-datavalidation/AccuracyChart";
import { fetchReports } from "../services/dashboardService";

const normalizeDecision = (decision) => {
  const value = String(decision || "").toLowerCase();
  if (value.includes("critical") || value.includes("วิกฤต")) return "Critical";
  if (value.includes("warning") || value.includes("high") || value.includes("เตือน")) return "Warning";
  if (value.includes("moderate") || value.includes("ปานกลาง")) return "Moderate";
  return "Low";
};

const toVerificationReport = (report) => {
  const analysis = report.ai_analysis;
  const confidence = Number(analysis?.confidence_score ?? 0);
  const fusionScore = Number(analysis?.final_fusion_score ?? 0);
  const statusMap = {
    pending: "WAITING",
    processing: "WAITING",
    completed: "VERIFIED",
    rejected: "CORRECTED",
  };

  return {
    id: report.id,
    reportId: report.id,
    roadName: analysis?.road_name || "ไม่ระบุชื่อถนน",
    district: analysis?.admin_district || "ไม่ระบุพื้นที่",
    createdAt: report.created_at
      ? new Date(report.created_at).toLocaleString("th-TH")
      : "-",
    aiDecision: normalizeDecision(analysis?.final_decision),
    confidence: Math.round(Math.max(0, Math.min(1, confidence)) * 100),
    fusionScore: fusionScore.toFixed(3),
    verificationStatus: statusMap[report.status] || "WAITING",
    image: report.image_url || `/uploads/${report.image_filename}`,
    annotatedImage: analysis?.annotated_image_filename
      ? `/uploads/${analysis.annotated_image_filename}`
      : null,
    rainfall: analysis?.rainfall_last_12m_mm,
    ndvi: analysis?.ndvi_index,
    slope: analysis?.slope,
  };
};

export default function AIVerificationPage() {

  const [filters, setFilters] = useState({
    keyword: "",
    decision: undefined,
    status: undefined,
    confidence: [0, 100],
    dateRange: null,
  });
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    fetchReports(1, 100)
      .then((result) => {
        if (!active) return;
        if (!result.success) throw new Error(result.error || "ไม่สามารถโหลดข้อมูลได้");
        setReports(result.data.reports.map(toVerificationReport));
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredReports = useMemo(() => reports.filter((report) => {
    const keyword = filters.keyword.trim().toLowerCase();
    const matchesKeyword = !keyword || [report.reportId, report.roadName]
      .some((value) => String(value || "").toLowerCase().includes(keyword));
    const matchesDecision = !filters.decision || report.aiDecision === filters.decision;
    const matchesStatus = !filters.status || report.verificationStatus === filters.status;
    const matchesConfidence = report.confidence >= filters.confidence[0] &&
      report.confidence <= filters.confidence[1];
    return matchesKeyword && matchesDecision && matchesStatus && matchesConfidence;
  }), [filters, reports]);

  return (
    <>
      {error && <Alert type="error" showIcon message="ไม่สามารถโหลดข้อมูล AI Validation ได้" description={error} />}

      {loading ? <Spin tip="กำลังโหลดข้อมูลจากฐานข้อมูล..." size="large" /> : (
        <>
      <SummaryCards reports={reports} />

      <br />

      <VerificationFilter
        filters={filters}
        setFilters={setFilters}
      />

      <br />

      <Row gutter={16}>
        <Col span={17}>
          <VerificationTable
            reports={filteredReports}
          />
        </Col>

        <Col span={7}>
          <AccuracyChart reports={reports} />
        </Col>
      </Row>
        </>
      )}
    </>
  );
}