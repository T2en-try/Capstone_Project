import {
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  Row,
  Select,
  Slider,
} from "antd";

import {
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";

const { RangePicker } = DatePicker;

export default function VerificationFilter({
  filters,
  setFilters,
}) {

  const handleChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReset = () => {
    setFilters({
      keyword: "",
      decision: undefined,
      status: undefined,
      confidence: [0, 100],
      dateRange: null,
    });
  };

  return (
    <Card>
      <Row gutter={[16, 16]} align="bottom">

        <Col xs={24} md={8} lg={6}>
          <Input
            placeholder="Search Report ID / Road"
            value={filters.keyword}
            onChange={(e) =>
              handleChange("keyword", e.target.value)
            }
          />
        </Col>

        <Col xs={12} md={6} lg={4}>
          <Select
            style={{ width: "100%" }}
            placeholder="AI Decision"
            allowClear
            value={filters.decision}
            onChange={(value) =>
              handleChange("decision", value)
            }
            options={[
              { label: "Critical", value: "Critical" },
              { label: "Warning", value: "Warning" },
              { label: "Moderate", value: "Moderate" },
              { label: "Low", value: "Low" },
            ]}
          />
        </Col>

        <Col xs={12} md={6} lg={4}>
          <Select
            style={{ width: "100%" }}
            placeholder="Status"
            allowClear
            value={filters.status}
            onChange={(value) =>
              handleChange("status", value)
            }
            options={[
              { label: "Waiting", value: "WAITING" },
              { label: "Verified", value: "VERIFIED" },
              { label: "Corrected", value: "CORRECTED" },
            ]}
          />
        </Col>

        <Col xs={24} md={12} lg={5}>
          <RangePicker
            style={{ width: "100%" }}
            value={filters.dateRange}
            onChange={(value) =>
              handleChange("dateRange", value)
            }
          />
        </Col>

        <Col xs={24} lg={5}>
          <div style={{ marginBottom: 8 }}>
            Confidence (%)
          </div>

          <Slider
            range
            value={filters.confidence}
            onChange={(value) =>
              handleChange("confidence", value)
            }
          />
        </Col>

        <Col xs={24}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
            >
              Reset
            </Button>

            <Button
              type="primary"
              icon={<SearchOutlined />}
            >
              Search
            </Button>
          </div>
        </Col>

      </Row>
    </Card>
  );
}