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

const FilterBar = () => {
  return (
    <Row gutter={[16, 16]} align="middle">
      {/* Search */}
      <Col xs={24} md={8}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search Report ID, Road Name..."
        />
      </Col>

      {/* Status */}
      <Col xs={12} md={4}>
        <Select
          style={{ width: "100%" }}
          placeholder="Status"
          options={[
            { label: "All", value: "all" },
            { label: "Pending", value: "Pending" },
            { label: "Processing", value: "Processing" },
            { label: "Completed", value: "Completed" },
          ]}
        />
      </Col>

      {/* Priority */}
      <Col xs={12} md={4}>
        <Select
          style={{ width: "100%" }}
          placeholder="Priority"
          options={[
            { label: "All", value: "all" },
            { label: "Very High", value: "Very High" },
            { label: "High", value: "High" },
            { label: "Medium", value: "Medium" },
            { label: "Low", value: "Low" },
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
          <Button icon={<ReloadOutlined />}>
            Reset Filters
          </Button>
        </Space>
      </Col>
    </Row>
  );
};

export default FilterBar;