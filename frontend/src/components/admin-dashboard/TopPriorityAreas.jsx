import { useEffect, useState } from "react";
import { Card, Tag, Spin, Typography, Table, Tooltip, Badge, Button, Select, Space, Progress } from "antd";
import {
  TrophyOutlined, FireOutlined, InfoCircleOutlined,
  ArrowRightOutlined, ReloadOutlined,
} from "@ant-design/icons";
import { fetchGridPriority } from "../../services/analyticsService";

const { Text } = Typography;

const LEVEL_CONFIG = {
  critical: { color: "#ff4d4f", label: "เร่งด่วน", tagColor: "red" },
  high:     { color: "#fa8c16", label: "สูง",       tagColor: "orange" },
  medium:   { color: "#fadb14", label: "ปานกลาง", tagColor: "gold" },
  low:      { color: "#52c41a", label: "ต่ำ",       tagColor: "green" },
};

const DAY_OPTIONS = [
  { label: "7 วัน", value: 7 },
  { label: "14 วัน", value: 14 },
  { label: "30 วัน", value: 30 },
];

/**
 * TopPriorityAreas — ตารางพื้นที่ Priority สูงสุด Top N
 */
export default function TopPriorityAreas({ topN = 5 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const load = () => {
    setLoading(true);
    fetchGridPriority(days)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [days]);

  const topGrids = data?.grids?.slice(0, topN) ?? [];

  const columns = [
    {
      title: "#",
      width: 36,
      render: (_, __, idx) => (
        <span style={{ fontWeight: 700, color: idx === 0 ? "#ff4d4f" : idx === 1 ? "#fa8c16" : "#595959" }}>
          {idx + 1}
        </span>
      ),
    },
    {
      title: "Grid ID",
      dataIndex: "grid_id",
      render: (v) => <Text code style={{ fontSize: 11 }}>{v}</Text>,
    },
    {
      title: "รายงาน (7 วัน)",
      dataIndex: "report_count",
      align: "center",
      render: (v) => <Badge count={v} color="#1677ff" overflowCount={999} showZero />,
    },
    {
      title: (
        <Tooltip title="PPI (AI Score)">
          <span>PPI (AI)</span>
        </Tooltip>
      ),
      dataIndex: "avg_ppi",
      align: "center",
      render: (v) => <Text strong>{v.toFixed(0)}</Text>,
    },
    {
      title: (
        <Tooltip title="Community Urgency Score">
          <span>CUS (ประชาชน)</span>
        </Tooltip>
      ),
      dataIndex: "cus",
      align: "center",
      render: (v) => <Text style={{ color: "#722ed1" }}>{v.toFixed(0)}</Text>,
    },
    {
      title: "Overall Priority",
      dataIndex: "overall_priority",
      align: "center",
      render: (v, row) => {
        const cfg = LEVEL_CONFIG[row.priority_level] ?? LEVEL_CONFIG.low;
        return (
          <div>
            <Progress
              percent={v}
              size="small"
              strokeColor={cfg.color}
              format={() => <span style={{ color: cfg.color, fontWeight: 700 }}>{v.toFixed(0)}</span>}
            />
            <Tag color={cfg.tagColor} style={{ marginTop: 2 }}>{cfg.label}</Tag>
          </div>
        );
      },
    },
  ];

  return (
    <Card
      style={{ borderRadius: 14 }}
      title={
        <Space>
          <TrophyOutlined style={{ color: "#faad14" }} />
          <span>พื้นที่เร่งด่วนสูงสุด</span>
          <Tooltip title="จัดอันดับตาม Overall Priority = 0.8×PPI + 0.2×CUS">
            <InfoCircleOutlined style={{ color: "#8c8c8c", fontSize: 13 }} />
          </Tooltip>
        </Space>
      }
      extra={
        <Space size={8}>
          <Select
            size="small"
            value={days}
            options={DAY_OPTIONS}
            onChange={setDays}
            style={{ width: 90 }}
          />
          <Button size="small" icon={<ReloadOutlined />} onClick={load} />
        </Space>
      }
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 32 }}>
          <Spin tip="กำลังคำนวณ..." />
        </div>
      ) : (
        <Table
          dataSource={topGrids}
          columns={columns}
          rowKey="grid_id"
          pagination={false}
          size="small"
          locale={{ emptyText: "ไม่มีข้อมูลในพื้นที่ศึกษา" }}
        />
      )}
      {data && (
        <div style={{ textAlign: "right", marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            รวม {data.total_grids_with_reports} พื้นที่ที่มี Report
          </Text>
        </div>
      )}
    </Card>
  );
}
