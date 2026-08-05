import { Card, Input, Select, Space, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";

export default function FilterBar() {
  return (
    <Card style={{ marginBottom: 16 }}>
      <Space wrap>
        <Input
          placeholder="Search Road"
          style={{ width: 250 }}
        />

        <Select
          defaultValue="All Severity"
          style={{ width: 170 }}
          options={[
            { value: "all", label: "All Severity" },
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
          ]}
        />

        <Select
          defaultValue="All Status"
          style={{ width: 170 }}
          options={[
            { value: "all", label: "All Status" },
            { value: "pending", label: "Pending" },
            { value: "processing", label: "Processing" },
            { value: "completed", label: "Completed" },
          ]}
        />

        <Button
          type="primary"
          icon={<SearchOutlined />}
        >
          Search
        </Button>
      </Space>
    </Card>
  );
}