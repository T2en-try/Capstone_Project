import { useEffect, useState, useCallback } from "react";
import {
  Table, Tag, Progress, Button, Space, Card, Typography,
  Select, Row, Col, Tooltip, Badge, Divider, Statistic,
} from "antd";
import {
  ReloadOutlined, DownloadOutlined, WarningOutlined,
  FireOutlined, InfoCircleOutlined, AppstoreOutlined,
} from "@ant-design/icons";
import { fetchGridPriority } from "../../services/analyticsService";

const { Title, Text } = Typography;

const LEVEL_CONFIG = {
  critical: { color: "#ff4d4f", bg: "#fff1f0", tagColor: "red",    label: "เร่งด่วน" },
  high:     { color: "#fa8c16", bg: "#fff7e6", tagColor: "orange",  label: "สูง" },
  medium:   { color: "#fadb14", bg: "#feffe6", tagColor: "gold",    label: "ปานกลาง" },
  low:      { color: "#52c41a", bg: "#f6ffed", tagColor: "green",   label: "ต่ำ" },
};

const DAY_OPTIONS = [
  { label: "7 วัน",  value: 7 },
  { label: "14 วัน", value: 14 },
  { label: "30 วัน", value: 30 },
  { label: "90 วัน", value: 90 },
];

const LEVEL_FILTER_OPTIONS = [
  { label: "ทั้งหมด",    value: "all" },
  { label: "เร่งด่วน",  value: "critical" },
  { label: "สูง",       value: "high" },
  { label: "ปานกลาง",   value: "medium" },
  { label: "ต่ำ",       value: "low" },
];

export default function GridPriorityTable() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [days, setDays]         = useState(7);
  const [levelFilter, setLevel] = useState("all");

  const load = useCallback(() => {
    setLoading(true);
    fetchGridPriority(days)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const grids = (data?.grids ?? []).filter(
    (g) => levelFilter === "all" || g.priority_level === levelFilter
  );

  const columns = [
    {
      title: "#",
      width: 50,
      fixed: "left",
      render: (_, __, idx) => (
        <span
          style={{
            fontWeight: 700,
            color: idx === 0 ? "#ff4d4f" : idx === 1 ? "#fa8c16" : idx === 2 ? "#faad14" : "#595959",
          }}
        >
          {idx + 1}
        </span>
      ),
    },
    {
      title: "Grid ID",
      dataIndex: "grid_id",
      fixed: "left",
      width: 110,
      render: (v) => <Text code style={{ fontSize: 11 }}>{v}</Text>,
    },
    {
      title: (
        <Tooltip title="Overall Priority = 0.8×PPI + 0.2×CUS">
          <span>Overall Priority <InfoCircleOutlined style={{ fontSize: 11 }} /></span>
        </Tooltip>
      ),
      dataIndex: "overall_priority",
      width: 200,
      sorter: (a, b) => b.overall_priority - a.overall_priority,
      defaultSortOrder: "ascend",
      render: (v, row) => {
        const cfg = LEVEL_CONFIG[row.priority_level] ?? LEVEL_CONFIG.low;
        return (
          <Space direction="vertical" size={2} style={{ width: "100%" }}>
            <Progress
              percent={Math.round(v)}
              size="small"
              strokeColor={cfg.color}
              format={(p) => (
                <b style={{ color: cfg.color, fontSize: 13 }}>{p}</b>
              )}
            />
            <Tag color={cfg.tagColor}>{cfg.label}</Tag>
          </Space>
        );
      },
    },
    {
      title: (
        <Tooltip title="PPI จาก AI Multi-Fusion (Heuristic + Fuzzy + ML)">
          <span>PPI (AI) <InfoCircleOutlined style={{ fontSize: 11 }} /></span>
        </Tooltip>
      ),
      dataIndex: "avg_ppi",
      width: 130,
      sorter: (a, b) => b.avg_ppi - a.avg_ppi,
      render: (v) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 15 }}>{v.toFixed(1)}</Text>
          <Progress percent={v} size="small" showInfo={false} strokeColor="#1677ff" />
        </Space>
      ),
    },
    {
      title: (
        <Tooltip title="Community Urgency Score = 0.4×Count + 0.3×Density + 0.3×Recency">
          <span>CUS (ประชาชน) <InfoCircleOutlined style={{ fontSize: 11 }} /></span>
        </Tooltip>
      ),
      dataIndex: "cus",
      width: 160,
      sorter: (a, b) => b.cus - a.cus,
      render: (v, row) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 15, color: "#722ed1", fontWeight: 700 }}>{v.toFixed(1)}</Text>
          <Progress percent={v} size="small" showInfo={false} strokeColor="#722ed1" />
        </Space>
      ),
    },
    {
      title: "รายงาน",
      dataIndex: "report_count",
      width: 90,
      align: "center",
      sorter: (a, b) => b.report_count - a.report_count,
      render: (v) => <Badge count={v} color="#1677ff" overflowCount={999} showZero />,
    },
    {
      title: (
        <Tooltip title="Count Score (C): normalize 0-100">Count (C)</Tooltip>
      ),
      dataIndex: "count_score",
      width: 100,
      align: "center",
      render: (v) => <Text style={{ fontSize: 12 }}>{v.toFixed(0)}</Text>,
    },
    {
      title: (
        <Tooltip title="Density Score (D): ความหนาแน่น normalize 0-100">Density (D)</Tooltip>
      ),
      dataIndex: "density_score",
      width: 110,
      align: "center",
      render: (v) => <Text style={{ fontSize: 12 }}>{v.toFixed(0)}</Text>,
    },
    {
      title: (
        <Tooltip title="Recency Score (R): R(t)=e^(-t/30) ×100">Recency (R)</Tooltip>
      ),
      dataIndex: "recency_score",
      width: 110,
      align: "center",
      sorter: (a, b) => b.recency_score - a.recency_score,
      render: (v) => <Text style={{ fontSize: 12 }}>{v.toFixed(0)}</Text>,
    },
    {
      title: "พิกัดศูนย์กลาง",
      width: 170,
      render: (_, row) => (
        <Text style={{ fontSize: 11, color: "#8c8c8c" }}>
          {row.lat_center.toFixed(5)}, {row.lon_center.toFixed(5)}
        </Text>
      ),
    },
  ];

  const summary = data?.summary ?? {};

  return (
    <div>
      {/* Summary Stats */}
      {data && (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => (
            <Col xs={12} sm={6} key={key}>
              <Card
                size="small"
                style={{
                  borderRadius: 12,
                  borderLeft: `4px solid ${cfg.color}`,
                  background: cfg.bg,
                  cursor: "pointer",
                  transition: "box-shadow 0.2s",
                }}
                onClick={() => setLevel(levelFilter === key ? "all" : key)}
                hoverable
              >
                <Statistic
                  title={<span style={{ fontSize: 12, color: cfg.color }}>{cfg.label}</span>}
                  value={summary[key] ?? 0}
                  suffix="พื้นที่"
                  valueStyle={{ color: cfg.color, fontWeight: 700, fontSize: 22 }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Toolbar */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space size={12}>
            <Text style={{ fontWeight: 600 }}>
              <AppstoreOutlined style={{ color: "#13c2c2", marginRight: 6 }} />
              Grid Priority List
            </Text>
            {data && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {grids.length} พื้นที่ ({summary.total_reports_analyzed ?? 0} รายงาน)
              </Text>
            )}
          </Space>
        </Col>

        <Col>
          <Space size={8}>
            <Select
              size="small"
              value={levelFilter}
              options={LEVEL_FILTER_OPTIONS}
              onChange={setLevel}
              style={{ width: 110 }}
              placeholder="ระดับ"
            />
            <Select
              size="small"
              value={days}
              options={DAY_OPTIONS}
              onChange={setDays}
              style={{ width: 90 }}
            />
            <Button size="small" icon={<ReloadOutlined />} onClick={load} loading={loading}>
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>

      <Divider style={{ margin: "8px 0 16px" }} />

      {/* Table */}
      <Table
        rowKey="grid_id"
        dataSource={grids}
        columns={columns}
        loading={loading}
        scroll={{ x: 1300 }}
        size="small"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
          showTotal: (total) => `ทั้งหมด ${total} พื้นที่`,
        }}
        rowClassName={(row) => {
          if (row.priority_level === "critical") return "row-critical";
          if (row.priority_level === "high")     return "row-high";
          return "";
        }}
        locale={{ emptyText: "ไม่มีข้อมูลในพื้นที่ศึกษา" }}
      />

      {data?.generated_at && (
        <Text type="secondary" style={{ fontSize: 11, display: "block", textAlign: "right", marginTop: 8 }}>
          อัพเดทล่าสุด: {new Date(data.generated_at).toLocaleString("th-TH")}
        </Text>
      )}
    </div>
  );
}
