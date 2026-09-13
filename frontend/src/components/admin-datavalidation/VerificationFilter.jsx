import {
  Card,
  Col,
  DatePicker,
  Input,
  Row,
  Select,
  Slider,
} from "antd";

import {
  SearchOutlined,
} from "@ant-design/icons";

const { RangePicker } = DatePicker;

const COLORS = {
  text: "#1F2937",
  secondary: "#64748B",
  border: "#E5E7EB",
  primary: "#2563EB",
  background: "#FFFFFF",
};

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

  return (
    
      <Row
        gutter={[12, 12]}
        align="middle"
      >
        {/* ==========================================
            Search
        ========================================== */}

        <Col
          xs={24}
          sm={12}
          md={8}
          lg={6}
          xl={6}
        >
          <Input
            allowClear
            size="middle"
            prefix={
              <SearchOutlined
                style={{
                  color: COLORS.secondary,
                }}
              />
            }
            placeholder="ค้นหา Report ID / ชื่อถนน"
            value={filters.keyword}
            onChange={(e) =>
              handleChange(
                "keyword",
                e.target.value
              )
            }
            style={{
              width: "100%",
              height: 38,
              borderRadius: 6,
              borderColor: COLORS.border,
            }}
          />
        </Col>

        {/* ==========================================
            AI Decision
        ========================================== */}

        <Col
          xs={24}
          sm={12}
          md={6}
          lg={4}
          xl={4}
        >
          <Select
            size="middle"
            allowClear
            placeholder="ผลการวิเคราะห์ AI"
            value={filters.decision}
            onChange={(value) =>
              handleChange(
                "decision",
                value
              )
            }
            style={{
              width: "100%",
            }}
            options={[
              {
                label: "Critical",
                value:
                  "Critical (ต้องซ่อมแซมด่วน)",
              },
              {
                label: "Warning",
                value:
                  "Warning (ควรเฝ้าระวัง)",
              },
              {
                label: "Good",
                value:
                  "Good (สภาพปกติ)",
              },
            ]}
          />
        </Col>

        {/* ==========================================
            Status
        ========================================== */}

        <Col
          xs={24}
          sm={12}
          md={6}
          lg={4}
          xl={4}
        >
          <Select
            size="middle"
            allowClear
            placeholder="สถานะการตรวจสอบ"
            value={filters.status}
            onChange={(value) =>
              handleChange(
                "status",
                value
              )
            }
            style={{
              width: "100%",
            }}
            options={[
              {
                label: "รอตรวจสอบ",
                value: "WAITING",
              },
              {
                label: "ยืนยันแล้ว",
                value: "VERIFIED",
              },
              {
                label: "ปฏิเสธ",
                value: "REJECTED",
              },
            ]}
          />
        </Col>

        {/* ==========================================
            Date
        ========================================== */}

        <Col
          xs={24}
          sm={12}
          md={10}
          lg={5}
          xl={5}
        >
          <RangePicker
            size="middle"
            style={{
              width: "100%",
              height: 38,
              borderRadius: 6,
              borderColor: COLORS.border,
            }}
            value={filters.dateRange}
            onChange={(value) =>
              handleChange(
                "dateRange",
                value
              )
            }
            placeholder={[
              "วันที่เริ่มต้น",
              "วันที่สิ้นสุด",
            ]}
          />
        </Col>

        {/* ==========================================
            Confidence
        ========================================== */}

        <Col
          xs={24}
          md={14}
          lg={5}
          xl={5}
        >
          <div
            style={{
              padding: "0 4px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: COLORS.text,
                }}
              >
                Confidence
              </span>

              <span
                style={{
                  fontSize: 11,
                  color: COLORS.secondary,
                }}
              >
                {filters.confidence?.[0] ??
                  0}
                % –{" "}
                {filters.confidence?.[1] ??
                  100}
                %
              </span>
            </div>

            <Slider
              range
              min={0}
              max={100}
              value={
                filters.confidence || [
                  0,
                  100,
                ]
              }
              onChange={(value) =>
                handleChange(
                  "confidence",
                  value
                )
              }
              tooltip={{
                formatter: (value) =>
                  `${value}%`,
              }}
              style={{
                margin: "6px 4px 2px",
              }}
            />
          </div>
        </Col>
      </Row>
   
  );
}