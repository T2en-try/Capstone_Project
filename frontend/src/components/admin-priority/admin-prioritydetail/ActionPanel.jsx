import { useState, useEffect } from "react";
import {
  Select,
  Button,
  Space,
  Input,
  Typography,
  message,
} from "antd";
import { updatePriorityStatus } from "../../../services/dashboardService";
import { getReportStatus } from "../../../utils/statusHelper";

const { Text } = Typography;

const ActionPanel = ({ report, onStatusChange }) => {
  const currentStatus = getReportStatus(report);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [actionNote, setActionNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedStatus(getReportStatus(report));
  }, [report]);

  const handleSave = async () => {
    if (!report?.id) return;

    if (selectedStatus === currentStatus && !actionNote.trim()) {
      message.info("สถานะยังไม่ได้เปลี่ยนแปลงและไม่มีการเพิ่มหมายเหตุ");
      return;
    }

    setLoading(true);
    try {
      const result = await updatePriorityStatus(report.id, selectedStatus, actionNote);
      if (result.success) {
        message.success("อัปเดตสถานะและบันทึกประวัติสำเร็จ");
        setActionNote("");
        if (onStatusChange) {
          onStatusChange(result.data);
        }
      } else {
        message.error(result.error || "ไม่สามารถอัปเดตสถานะได้");
      }
    } catch (err) {
      message.error("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space
      direction="vertical"
      size={16}
      style={{
        width: "100%",
      }}
    >
      <div>
        <Text type="secondary" style={{ display: "block", marginBottom: 6 }}>
          สถานะการดำเนินงาน (Status):
        </Text>
        <Select
          style={{
            width: "100%",
          }}
          value={selectedStatus}
          onChange={(value) => setSelectedStatus(value)}
          options={[
            {
              label: "Pending (รอดำเนินการ)",
              value: "pending",
            },
            {
              label: "Processing (กำลังดำเนินการ)",
              value: "processing",
            },
            {
              label: "Completed (ดำเนินการเสร็จสิ้น)",
              value: "completed",
            },
          ]}
        />
      </div>

      <div>
        <Text type="secondary" style={{ display: "block", marginBottom: 6 }}>
          บันทึกการปฏิบัติงาน (Note / หมายเหตุ):
        </Text>
        <Input.TextArea
          rows={3}
          value={actionNote}
          onChange={(e) => setActionNote(e.target.value)}
          placeholder="ระบุว่าทำอะไรไปบ้าง เช่น ส่งเจ้าหน้าที่ลงพื้นที่, ซ่อมแซมผิวจราจรแล้ว..."
        />
      </div>

      <Button
        type="primary"
        block
        loading={loading}
        onClick={handleSave}
      >
        Save Changes
      </Button>
    </Space>
  );
};

export default ActionPanel;