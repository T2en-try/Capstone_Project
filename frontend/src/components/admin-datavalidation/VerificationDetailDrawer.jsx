import {
  Drawer,
  Row,
  Col,
  Image,
  Descriptions,
  Tag,
  Divider,
  Button,
  Space,
  Progress,
  Typography,
} from "antd";

import {
  CloseOutlined,
  RobotOutlined,
  EnvironmentOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

/* =========================================================
   Design System
========================================================= */

const COLORS = {
  ink: "#14352F",
  inkSoft: "#1F4A42",

  mark: "#E6A817",
  markDeep: "#C48A0A",

  paper: "#F7FAF8",
  asphalt: "#2A3431",
  line: "#C5D4CF",

  danger: "#C45C4A",
  ok: "#2D7A5F",
  warn: "#C4891A",
  info: "#2F6F7E",

  neutral: "#66736F",
  white: "#FFFFFF",
};

/* =========================================================
   Helpers
========================================================= */

const getPriorityConfig = (priorityClass) => {
  const value = Number(priorityClass);

  switch (value) {
    case 3:
      return {
        label: "Critical",
        thaiLabel: "วิกฤต",
        color: COLORS.danger,
        background: "#FFF3F0",
      };

    case 2:
      return {
        label: "Warning",
        thaiLabel: "ควรระวัง",
        color: COLORS.warn,
        background: "#FFF9E8",
      };

    case 1:
      return {
        label: "Good",
        thaiLabel: "ปกติ",
        color: COLORS.ok,
        background: "#F1F8F5",
      };

    default:
      return {
        label: "ยังไม่มีผลวิเคราะห์",
        thaiLabel: "ยังไม่มีผลวิเคราะห์",
        color: COLORS.neutral,
        background: "#F5F7F6",
      };
  }
};

const getVerificationConfig = (status) => {
  switch (status) {
    case "VERIFIED":
      return {
        label: "ยืนยันแล้ว",
        color: COLORS.ok,
      };

    case "REJECTED":
      return {
        label: "ปฏิเสธ",
        color: COLORS.danger,
      };

    default:
      return {
        label: "รอตรวจสอบ",
        color: COLORS.warn,
      };
  }
};

const formatNumber = (value, digits = 2) => {
  if (value == null || Number.isNaN(Number(value))) {
    return "-";
  }

  return Number(value).toFixed(digits);
};

/* =========================================================
   Section
========================================================= */

function Section({
  icon,
  title,
  subtitle,
  children,
}) {
  return (
    <section
      style={{
        marginBottom: 20,
        paddingBottom: 18,
        borderBottom: `1px solid ${COLORS.line}`,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 9,
          marginBottom: 13,
        }}
      >
        {icon && (
          <span
            style={{
              color: COLORS.markDeep,
              fontSize: 16,
              marginTop: 2,
            }}
          >
            {icon}
          </span>
        )}

        <div>
          <h3
            style={{
              margin: 0,
              color: COLORS.ink,
              fontFamily: "Kanit, sans-serif",
              fontSize: 17,
              fontWeight: 500,
              lineHeight: 1.3,
            }}
          >
            {title}
          </h3>

          {subtitle && (
            <Text
              style={{
                color: COLORS.neutral,
                fontFamily: "Sarabun, sans-serif",
                fontSize: 12,
              }}
            >
              {subtitle}
            </Text>
          )}
        </div>
      </header>

      {children}
    </section>
  );
}

/* =========================================================
   Probability
========================================================= */

function ProbabilityRow({
  label,
  value,
  color,
}) {
  const percent =
    value == null
      ? 0
      : Math.max(
          0,
          Math.min(100, Number(value) * 100)
        );

  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
          fontFamily: "Sarabun, sans-serif",
          fontSize: 13,
        }}
      >
        <Text>{label}</Text>

        <Text
          strong
          style={{
            color: COLORS.ink,
            fontFamily: "monospace",
          }}
        >
          {value == null
            ? "-"
            : `${Math.round(percent)}%`}
        </Text>
      </div>

      <Progress
        percent={percent}
        showInfo={false}
        strokeColor={color}
        trailColor="#E8EFEC"
        size="small"
      />
    </div>
  );
}

/* =========================================================
   Main Component
========================================================= */

export default function VerificationDetailDrawer({
  open,
  report,
  onClose,
}) {
  if (!report) return null;

  const priorityConfig = getPriorityConfig(
    report.priorityClass
  );

  const verificationConfig =
    getVerificationConfig(
      report.verificationStatus
    );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={900}
      destroyOnClose
      styles={{
        header: {
          borderBottom: `1px solid ${COLORS.line}`,
          padding: "14px 20px",
        },

        body: {
          padding: 20,
          background: COLORS.white,
        },
      }}
      title={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: COLORS.ink,
              color: COLORS.mark,
            }}
          >
            <RobotOutlined />
          </span>

          <div>
            <div
              style={{
                color: COLORS.ink,
                fontFamily: "Kanit, sans-serif",
                fontSize: 18,
                fontWeight: 500,
                lineHeight: 1.2,
              }}
            >
              AI Verification
            </div>

            <Text
              type="secondary"
              style={{
                fontSize: 12,
                fontFamily: "monospace",
              }}
            >
              Report #{report.reportId}
            </Text>
          </div>
        </div>
      }
    >
      {/* ===================================================
          Report Summary
      =================================================== */}

      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          padding: "12px 14px",
          marginBottom: 20,
          background: COLORS.paper,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 8,
          flexWrap: "wrap",
        }}
      >
        <div>
          <Text
            style={{
              display: "block",
              color: COLORS.ink,
              fontFamily: "Kanit, sans-serif",
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            {report.roadName}
          </Text>

          <Text
            type="secondary"
            style={{
              fontFamily: "Sarabun, sans-serif",
              fontSize: 12,
            }}
          >
            {report.district} · {report.createdAt}
          </Text>
        </div>

        <Space size={8}>
          <Tag
            style={{
              margin: 0,
              color: verificationConfig.color,
              background: COLORS.white,
              borderColor: verificationConfig.color,
              borderRadius: 5,
              fontFamily: "Sarabun, sans-serif",
            }}
          >
            {verificationConfig.label}
          </Tag>

          <Tag
            style={{
              margin: 0,
              color: priorityConfig.color,
              background: priorityConfig.background,
              borderColor: priorityConfig.color,
              borderRadius: 5,
              fontFamily: "Sarabun, sans-serif",
            }}
          >
            {priorityConfig.thaiLabel}
          </Tag>
        </Space>
      </section>

      {/* ===================================================
          Images
      =================================================== */}

      <Section
        icon={<FileSearchOutlined />}
        title="ภาพสำหรับตรวจสอบ"
        subtitle="ภาพต้นฉบับและภาพที่ผ่านการวิเคราะห์โดย AI"
      >
        <Row gutter={[14, 14]}>
          <Col xs={24} md={12}>
            <Text
              strong
              style={{
                display: "block",
                marginBottom: 7,
                color: COLORS.ink,
                fontFamily: "Sarabun, sans-serif",
              }}
            >
              ภาพต้นฉบับ
            </Text>

            <div
              style={{
                border: `1px solid ${COLORS.line}`,
                borderRadius: 7,
                overflow: "hidden",
                background: COLORS.paper,
                minHeight: 180,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {report.image ? (
                <Image
                  width="100%"
                  src={report.image}
                  preview
                />
              ) : (
                <Text type="secondary">
                  ไม่มีภาพต้นฉบับ
                </Text>
              )}
            </div>
          </Col>

          <Col xs={24} md={12}>
            <Text
              strong
              style={{
                display: "block",
                marginBottom: 7,
                color: COLORS.ink,
                fontFamily: "Sarabun, sans-serif",
              }}
            >
              ภาพที่ AI วิเคราะห์
            </Text>

            <div
              style={{
                border: `1px solid ${COLORS.line}`,
                borderRadius: 7,
                overflow: "hidden",
                background: COLORS.paper,
                minHeight: 180,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {report.annotatedImage ? (
                <Image
                  width="100%"
                  src={report.annotatedImage}
                  preview
                />
              ) : (
                <Text type="secondary">
                  ไม่มีภาพที่วิเคราะห์แล้ว
                </Text>
              )}
            </div>
          </Col>
        </Row>
      </Section>

      {/* ===================================================
          Report Information
      =================================================== */}

      <Section
        icon={<FileSearchOutlined />}
        title="ข้อมูลรายงาน"
      >
        <Descriptions
          column={{ xs: 1, sm: 2 }}
          size="small"
          colon={false}
          labelStyle={{
            color: COLORS.neutral,
            fontFamily: "Sarabun, sans-serif",
          }}
          contentStyle={{
            color: COLORS.asphalt,
            fontFamily: "Sarabun, sans-serif",
            fontWeight: 500,
          }}
        >
          <Descriptions.Item label="Report ID">
            <span
              style={{
                fontFamily: "monospace",
              }}
            >
              #{report.reportId}
            </span>
          </Descriptions.Item>

          <Descriptions.Item label="วันที่รายงาน">
            {report.createdAt}
          </Descriptions.Item>

          <Descriptions.Item label="ถนน">
            {report.roadName}
          </Descriptions.Item>

          <Descriptions.Item label="พื้นที่">
            {report.district}
          </Descriptions.Item>

          <Descriptions.Item label="AI Decision">
            <Tag
              style={{
                color: priorityConfig.color,
                background: priorityConfig.background,
                borderColor: priorityConfig.color,
                margin: 0,
              }}
            >
              {priorityConfig.thaiLabel}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Priority Class">
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 600,
              }}
            >
              {report.priorityClass ?? "-"}
            </span>
          </Descriptions.Item>
        </Descriptions>
      </Section>

      {/* ===================================================
          AI Analysis
      =================================================== */}

      <Section
        icon={<RobotOutlined />}
        title="ผลวิเคราะห์ AI"
        subtitle="ความมั่นใจและความน่าจะเป็นของแต่ละระดับ"
      >
        <Row gutter={[20, 18]}>
          <Col xs={24} md={10}>
            <div
              style={{
                padding: 14,
                border: `1px solid ${COLORS.line}`,
                borderRadius: 8,
                background: COLORS.paper,
              }}
            >
              <Text
                type="secondary"
                style={{
                  fontFamily: "Sarabun, sans-serif",
                  fontSize: 12,
                }}
              >
                Confidence
              </Text>

              <div
                style={{
                  marginTop: 4,
                  color: COLORS.ink,
                  fontFamily: "monospace",
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                {report.confidence ?? 0}%
              </div>

              <Progress
                percent={report.confidence ?? 0}
                showInfo={false}
                strokeColor={COLORS.markDeep}
                trailColor="#E8EFEC"
                size="small"
              />
            </div>
          </Col>

          <Col xs={24} md={14}>
            <ProbabilityRow
              label="Normal"
              value={report.probaNormal}
              color={COLORS.ok}
            />

            <ProbabilityRow
              label="Warning"
              value={report.probaWarning}
              color={COLORS.warn}
            />

            <ProbabilityRow
              label="Critical"
              value={report.probaCritical}
              color={COLORS.danger}
            />
          </Col>
        </Row>
      </Section>

      {/* ===================================================
          Environmental Context
      =================================================== */}

      <Section
        icon={<EnvironmentOutlined />}
        title="บริบทสภาพแวดล้อม"
        subtitle="ข้อมูลประกอบจากการวิเคราะห์พื้นที่"
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={8}>
            <div
              style={{
                padding: "12px 14px",
                border: `1px solid ${COLORS.line}`,
                borderRadius: 7,
              }}
            >
              <Text
                type="secondary"
                style={{
                  display: "block",
                  fontFamily: "Sarabun, sans-serif",
                  fontSize: 12,
                }}
              >
                Rainfall
              </Text>

              <strong
                style={{
                  color: COLORS.ink,
                  fontFamily: "monospace",
                  fontSize: 18,
                }}
              >
                {formatNumber(report.rainfall)}{" "}
                <small>mm</small>
              </strong>
            </div>
          </Col>

          <Col xs={24} sm={8}>
            <div
              style={{
                padding: "12px 14px",
                border: `1px solid ${COLORS.line}`,
                borderRadius: 7,
              }}
            >
              <Text
                type="secondary"
                style={{
                  display: "block",
                  fontFamily: "Sarabun, sans-serif",
                  fontSize: 12,
                }}
              >
                NDVI
              </Text>

              <strong
                style={{
                  color: COLORS.ink,
                  fontFamily: "monospace",
                  fontSize: 18,
                }}
              >
                {formatNumber(report.ndvi)}
              </strong>
            </div>
          </Col>

          <Col xs={24} sm={8}>
            <div
              style={{
                padding: "12px 14px",
                border: `1px solid ${COLORS.line}`,
                borderRadius: 7,
              }}
            >
              <Text
                type="secondary"
                style={{
                  display: "block",
                  fontFamily: "Sarabun, sans-serif",
                  fontSize: 12,
                }}
              >
                Slope
              </Text>

              <strong
                style={{
                  color: COLORS.ink,
                  fontFamily: "monospace",
                  fontSize: 18,
                }}
              >
                {formatNumber(report.slope)}{" "}
                <small>°</small>
              </strong>
            </div>
          </Col>
        </Row>
      </Section>

      {/* ===================================================
          Close
      =================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Button
          icon={<CloseOutlined />}
          onClick={onClose}
          style={{
            borderColor: COLORS.line,
            color: COLORS.ink,
            borderRadius: 7,
          }}
        >
          ปิด
        </Button>
      </div>
    </Drawer>
  );
}