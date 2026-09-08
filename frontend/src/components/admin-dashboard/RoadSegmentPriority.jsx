import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Select, Space, Spin, Table, Tag, Typography } from "antd";
import { EnvironmentOutlined, ReloadOutlined } from "@ant-design/icons";
import { fetchRoadSegmentPriority } from "../../services/analyticsService";

const { Text } = Typography;

const PRIORITY_CONFIG = {
  1: { label: "Normal", color: "green" },
  2: { label: "Warning", color: "orange" },
  3: { label: "Critical", color: "red" },
};

export default function RoadSegmentPriority() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await fetchRoadSegmentPriority(days));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      title: "OSM Way ID",
      dataIndex: "segment_id",
      render: (value) => <Text code>{value}</Text>,
    },
    {
      title: "ถนน",
      dataIndex: "road_name",
      render: (value) => value || "ไม่ระบุชื่อถนน",
    },
    {
      title: "จุดรายงาน",
      dataIndex: "report_count",
      align: "center",
      render: (value) => <Badge count={value} showZero color="#1677ff" />,
    },
    {
      title: "Priority รวม",
      dataIndex: "priority_class",
      render: (value, row) => {
        const config = PRIORITY_CONFIG[value];
        return <Tag color={config?.color || "default"}>{row.priority_label}</Tag>;
      },
    },
    {
      title: "Confidence จุดแย่สุด",
      dataIndex: "confidence_score",
      render: (value) => value == null ? "-" : `${Math.round(value * 100)}%`,
    },
    {
      title: "จุดที่แย่ที่สุด",
      dataIndex: "worst_report_id",
      render: (value) => value ? `Report #${value}` : "-",
    },
  ];

  return (
    <Card
      title={<Space><EnvironmentOutlined style={{ color: "#1677ff" }} /><span>Road-Segment Priority</span></Space>}
      extra={<Space><Select size="small" value={days} onChange={setDays} options={[7, 30, 90].map((value) => ({ value, label: `${value} วัน` }))} /><Button size="small" icon={<ReloadOutlined />} onClick={load} /></Space>}
      style={{ borderRadius: 14 }}
    >
      <Text type="secondary">
        รวมรายงานตาม OSM Way ID ด้วยวิธี Max Severity จาก {data?.total_reports_analyzed || 0} รายงาน
      </Text>
      {error ? <div style={{ color: "#ff4d4f", marginTop: 16 }}>{error}</div> : loading ? (
        <div style={{ textAlign: "center", padding: 32 }}><Spin /></div>
      ) : (
        <Table
          style={{ marginTop: 16 }}
          rowKey="segment_id"
          columns={columns}
          dataSource={data?.segments || []}
          pagination={{ pageSize: 5 }}
          scroll={{ x: 760 }}
          locale={{ emptyText: "ยังไม่มีรายงานที่มี OSM Way ID" }}
        />
      )}
    </Card>
  );
}