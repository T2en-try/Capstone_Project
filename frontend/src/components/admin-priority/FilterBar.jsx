import {
  Button,
  Col,
  DatePicker,
  Input,
  Row,
  Select,
  Space,
} from "antd";

import {
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

const { RangePicker } = DatePicker;

const FilterBar = ({ filters, onChange }) => {
  const updateFilter = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <Row gutter={[16, 16]} align="middle">
      {/* Search */}
      <Col xs={24} md={8}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search Report ID, Road Name..."
          value={filters.keyword}
          onChange={(event) => updateFilter("keyword", event.target.value)}
        />
      </Col>

      {/* Status */}
      <Col xs={12} md={4}>
        <Select
          style={{ width: "100%" }}
          placeholder="Status"
          value={filters.status}
          onChange={(value) => updateFilter("status", value)}
          options={[
            { label: "All", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "Processing", value: "processing" },
            { label: "Completed", value: "completed" },
          ]}
        />
      </Col>

      {/* Priority */}
      <Col xs={12} md={4}>
        <Select
          style={{ width: "100%" }}
          placeholder="Priority"
          value={filters.priority}
          onChange={(value) => updateFilter("priority", value)}
          options={[
            { label: "All", value: "all" },
            { label: "Good", value: "Good (สภาพปกติ)" },
            { label: "Warning", value: "Warning (ควรเฝ้าระวัง)" },
            { label: "Critical", value: "Critical (ต้องซ่อมแซมด่วน)" },
          ]}
        />
      </Col>

      {/* Province */}
      <Col xs={12} md={4}>
        <Select
          style={{ width: "100%" }}
          placeholder="Province"
          options={[
            {
              label: "Nakhon Ratchasima",
              value: "Nakhon Ratchasima",
            },
          ]}
        />
      </Col>

      {/* Date */}
      <Col xs={24} md={4}>
        <RangePicker style={{ width: "100%" }} />
      </Col>

      {/* Reset */}
      <Col span={24}>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => onChange({ keyword: "", status: "all", priority: "all" })}
          >
            Reset Filters
          </Button>
        </Space>
      </Col>
    </Row>
  );
};

export default FilterBar;