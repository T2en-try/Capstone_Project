import { useEffect, useState } from "react";
import { Card, Col, Row, Tag, Spin, Typography, Tooltip, Progress } from "antd";
import { FireOutlined, TeamOutlined, ClockCircleOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { fetchGridPriority } from "../../services/analyticsService";

const { Text, Title } = Typography;

const LEVEL_CONFIG = {
  critical: { color: "#ff4d4f", bg: "#fff1f0", label: "เร่งด่วน (Critical)", antColor: "error" },
  high:     { color: "#fa8c16", bg: "#fff7e6", label: "สูง (High)",           antColor: "warning" },
  medium:   { color: "#fadb14", bg: "#feffe6", label: "ปานกลาง (Medium)",    antColor: "gold" },
  low:      { color: "#52c41a", bg: "#f6ffed", label: "ต่ำ (Low)",            antColor: "success" },
};

/**
 * GridPrioritySummary — แสดง summary card จำนวน Grid แต่ละ level
 */
export default function GridPrioritySummary({ days = 7 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchGridPriority(days)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <Card style={{ borderRadius: 14 }}><Spin tip="กำลังคำนวณ CASP..." /></Card>;
  if (error)   return <Card style={{ borderRadius: 14 }}><Text type="danger">❌ {error}</Text></Card>;
  if (!data)   return null;

  const { summary } = data;

  const cards = [
    { key: "critical", icon: <FireOutlined />, value: summary.critical },
    { key: "high",     icon: <FireOutlined />, value: summary.high },
    { key: "medium",   icon: <TeamOutlined />, value: summary.medium },
    { key: "low",      icon: <ClockCircleOutlined />, value: summary.low },
  ];

  return (
    <Card
      style={{ borderRadius: 14 }}
      title={
        <span>
          🗺️ สรุปประเภทความเร่งด่วน
          <Tooltip title="คำนวณจาก Overall Priority = 0.8×PPI + 0.2×CUS">
            <InfoCircleOutlined style={{ marginLeft: 6, color: "#8c8c8c", fontSize: 13 }} />
          </Tooltip>
        </span>
      }
      extra={<Text type="secondary" style={{ fontSize: 12 }}>วิเคราะห์ {summary.total_reports_analyzed} รายงาน ({days} วัน)</Text>}
    >
      <Row gutter={[12, 12]}>
        {cards.map(({ key, icon, value }) => {
          const cfg = LEVEL_CONFIG[key];
          return (
            <Col xs={12} sm={6} key={key}>
              <div
                style={{
                  background: cfg.bg,
                  borderRadius: 12,
                  padding: "14px 16px",
                  borderLeft: `4px solid ${cfg.color}`,
                }}
              >
                <div style={{ color: cfg.color, fontSize: 20 }}>{icon}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: cfg.color, lineHeight: 1.2 }}>{value}</div>
                <div style={{ fontSize: 12, color: "#595959", marginTop: 2 }}>{cfg.label}</div>
                <div style={{ fontSize: 10, color: "#8c8c8c" }}>พื้นที่</div>
              </div>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
}
