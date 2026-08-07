import { Card, Input, Select, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";

export default function FilterBar({
  filters,
  setFilters,
}) {
  return (
    <Card
      style={{
        marginBottom: 16,
        borderRadius: 12,
      }}
    >
      <Space wrap>
        <Input
          placeholder="ค้นหาชื่อถนน..."
          prefix={<SearchOutlined />}
          style={{ width: 250 }}
          value={filters.keyword}
          onChange={(e) =>
            setFilters({
              ...filters,
              keyword: e.target.value,
            })
          }
        />

        <Select
          style={{ width: 180 }}
          value={filters.severity}
          onChange={(value) =>
            setFilters({
              ...filters,
              severity: value,
            })
          }
          options={[
            {
              value: "All",
              label: "ทุกระดับความรุนแรง",
            },
            {
              value: "Critical",
              label: "Critical",
            },
            {
              value: "High",
              label: "High",
            },
            {
              value: "Medium",
              label: "Medium",
            },
            {
              value: "Low",
              label: "Low",
            },
          ]}
        />

        <Select
          style={{ width: 180 }}
          value={filters.status}
          onChange={(value) =>
            setFilters({
              ...filters,
              status: value,
            })
          }
          options={[
            {
              value: "All",
              label: "ทุกสถานะ",
            },
            {
              value: "Pending",
              label: "Pending",
            },
            {
              value: "Processing",
              label: "Processing",
            },
            {
              value: "Completed",
              label: "Completed",
            },
          ]}
        />
      </Space>
    </Card>
  );
}