import { Button, Card, Col, Row, Space, Typography } from "antd";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";

import SummaryCards from "../components/admin-priority/SummaryCards";
import FilterBar from "../components/admin-priority/FilterBar";
import ReportsTable from "../components/admin-priority/ReportsTable";

const { Title, Text } = Typography;

const PriorityReportsPage = () => {
  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={2} style={{ marginBottom: 4 }}>
            Priority Reports
          </Title>

          <Text type="secondary">
            View and manage road reports ranked by AI priority score.
          </Text>
        </Col>

        <Col>
          <Space>
            <Button icon={<ReloadOutlined />}>
              Refresh
            </Button>

            <Button
              type="primary"
              icon={<DownloadOutlined />}
            >
              Export
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Summary */}
      <div style={{ marginTop: 24 }}>
        <SummaryCards />
      </div>

      {/* Table */}
      <Card
        style={{ marginTop: 24 }}
        bodyStyle={{ padding: 20 }}
      >
        <FilterBar />

        <div style={{ marginTop: 20 }}>
          <ReportsTable />
        </div>
      </Card>
    </div>
  );
};

export default PriorityReportsPage;