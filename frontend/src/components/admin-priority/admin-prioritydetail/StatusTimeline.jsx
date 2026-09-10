import { Timeline, Tag, Typography, Empty } from "antd";
import {
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CommentOutlined,
} from "@ant-design/icons";
import { getStatusColor, formatActionDate } from "../../../utils/statusHelper";

const { Text, Paragraph } = Typography;

const getDotIcon = (status) => {
  const s = String(status || "").toLowerCase();
  switch (s) {
    case "completed":
      return <CheckCircleOutlined style={{ fontSize: 16, color: "#52c41a" }} />;
    case "processing":
      return <SyncOutlined spin style={{ fontSize: 16, color: "#1677ff" }} />;
    case "rejected":
      return <CloseCircleOutlined style={{ fontSize: 16, color: "#ff4d4f" }} />;
    case "pending":
    default:
      return <ClockCircleOutlined style={{ fontSize: 16, color: "#faad14" }} />;
  }
};

const StatusTimeline = ({ actions = [], history = [] }) => {
  // รองรับทั้ง actions (จากตาราง road_actions/report_actions) และ legacy history
  const rawItems = Array.isArray(actions) && actions.length > 0
    ? actions
    : (Array.isArray(history) ? history : []);

  if (!rawItems || rawItems.length === 0) {
    return (
      <Empty
        description="ยังไม่มีประวัติการดำเนินงาน"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  // เรียงลำดับจากเก่าไปใหม่ เพื่อให้ไทม์ไลน์อ่านตามลำดับเวลาการทำงาน
  const sortedItems = [...rawItems].sort((a, b) => {
    const timeA = new Date(a.action_timestamp || a.date || 0).getTime();
    const timeB = new Date(b.action_timestamp || b.date || 0).getTime();
    return timeA - timeB;
  });

  const timelineItems = sortedItems.map((item, idx) => {
    const status = item.new_status || item.status || (item.title ? item.title.toLowerCase() : "pending");
    const dateStr = formatActionDate(item.action_timestamp || item.date);
    const note = item.action_note || item.note || (item.title && item.title !== "Report Submitted" ? item.title : "");

    return {
      key: item.id || idx,
      dot: getDotIcon(status),
      children: (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <Tag
              color={getStatusColor(status)}
              style={{
                fontWeight: 600,
                textTransform: "capitalize",
                fontSize: 13,
                padding: "2px 10px",
              }}
            >
              {status}
            </Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dateStr}
            </Text>
          </div>

          {note && (
            <div
              style={{
                marginTop: 8,
                padding: "8px 12px",
                background: "#f8fafc",
                borderLeft: "3px solid #1677ff",
                borderRadius: "0 8px 8px 0",
                fontSize: 13,
                color: "#334155",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                <CommentOutlined style={{ color: "#1677ff", marginTop: 3 }} />
                <Paragraph style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  {note}
                </Paragraph>
              </div>
            </div>
          )}
        </div>
      ),
    };
  });

  return (
    <div style={{ padding: "8px 4px" }}>
      <Timeline items={timelineItems} />
    </div>
  );
};

export default StatusTimeline;