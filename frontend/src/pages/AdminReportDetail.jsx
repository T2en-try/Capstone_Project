import {
  Row,
  Col,
  Card,
  Typography,
  Space,
  Button,
  Tag,
  Progress,
  Divider,
  Spin,
  Empty,
} from "antd";

import { useParams, useNavigate } from "react-router-dom";

import {
  FileSearchOutlined,
  ArrowLeftOutlined,
  RobotOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

import { useEffect, useState } from "react";

import {
  fetchReportById,
  getReportImageUrl,
} from "../services/dashboardService";

import {
  getConfidencePercent,
  getPriorityLabel,
  normalizePriorityClass,
} from "../utils/priorityMapping";

import {
  getReportStatus,
  formatActionDate,
} from "../utils/statusHelper";

import ReportHeader from "../components/admin-priority/admin-prioritydetail/ReportHeader";
import ReportInfoCard from "../components/admin-priority/admin-prioritydetail/ReportInfoCard";
import ReportImage from "../components/admin-priority/admin-prioritydetail/ReportImage";
import StatusTimeline from "../components/admin-priority/admin-prioritydetail/StatusTimeline";
import ActionPanel from "../components/admin-priority/admin-prioritydetail/ActionPanel";

const { Title, Text } = Typography;

/* =========================================================
   DESIGN SYSTEM
========================================================= */

const COLORS = {
  ink: "#14352F",
  inkSoft: "#1F4A42",
  mark: "#E6A817",
  markDeep: "#C48A0A",

  page: "#F5F7F6",
  paper: "#F7FAF8",
  white: "#FFFFFF",

  line: "#D9E2DE",
  asphalt: "#2A3431",
  neutral: "#66736F",

  danger: "#C45C4A",
  warn: "#C4891A",
  ok: "#2D7A5F",
  info: "#2F6F7E",
};

/* =========================================================
   PRIORITY
========================================================= */

const getPriorityConfig = (priorityClass) => {
  switch (priorityClass) {
    case 3:
      return {
        label: "Critical",
        thai: "เร่งด่วน",
        color: COLORS.danger,
        bg: "#FDF0ED",
      };

    case 2:
      return {
        label: "Warning",
        thai: "ควรเฝ้าระวัง",
        color: COLORS.warn,
        bg: "#FFF8E8",
      };

    case 1:
      return {
        label: "Good",
        thai: "ปกติ",
        color: COLORS.ok,
        bg: "#EEF8F3",
      };

    default:
      return {
        label: "ยังไม่มีผล",
        thai: "รอผลวิเคราะห์",
        color: COLORS.neutral,
        bg: "#F1F3F2",
      };
  }
};

/* =========================================================
   PROBABILITY BAR
========================================================= */

const ProbabilityBar = ({
  label,
  value,
  color,
}) => {
  const percent =
    value == null
      ? 0
      : Math.round(
          Math.max(
            0,
            Math.min(1, Number(value))
          ) * 100
        );

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 5,
        }}
      >
        <Text style={{ fontSize: 13 }}>
          {label}
        </Text>

        <Text
          strong
          style={{
            fontSize: 13,
            fontFamily: "monospace",
          }}
        >
          {value == null ? "-" : `${percent}%`}
        </Text>
      </div>

      <Progress
        percent={percent}
        showInfo={false}
        size="small"
        strokeColor={color}
        trailColor="#E7ECE9"
      />
    </div>
  );
};

/* =========================================================
   METRIC
========================================================= */

const Metric = ({
  label,
  value,
  suffix = "",
}) => {
  return (
    <div
      style={{
        padding: "14px 16px",
        border: `1px solid ${COLORS.line}`,
        borderRadius: 10,
        background: COLORS.white,
      }}
    >
      <Text
        style={{
          display: "block",
          fontSize: 12,
          color: COLORS.neutral,
          marginBottom: 5,
        }}
      >
        {label}
      </Text>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 4,
        }}
      >
        <Text
          strong
          style={{
            fontSize: 22,
            color: COLORS.ink,
            fontFamily: "monospace",
          }}
        >
          {value ?? "-"}
        </Text>

        {suffix && (
          <Text
            style={{
              fontSize: 12,
              color: COLORS.neutral,
            }}
          >
            {suffix}
          </Text>
        )}
      </div>
    </div>
  );
};

/* =========================================================
   LOCATION ROW
========================================================= */

const LocationRow = ({
  label,
  value,
  mono = false,
}) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "105px 1fr",
        gap: 12,
        padding: "9px 0",
        borderBottom: `1px solid ${COLORS.line}`,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          color: COLORS.neutral,
        }}
      >
        {label}
      </Text>

      <Text
        strong
        style={{
          fontSize: 13,
          color: COLORS.asphalt,
          fontFamily: mono
            ? "monospace"
            : "inherit",
        }}
      >
        {value || "-"}
      </Text>
    </div>
  );
};

/* =========================================================
   PAGE
========================================================= */

const AdminReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* =======================================================
     LOAD REPORT
  ======================================================= */

  useEffect(() => {
    let active = true;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    fetchReportById(id)
      .then((result) => {
        if (!active) return;

        if (!result.success) {
          setError(
            result.error ||
              "ไม่สามารถโหลดรายงานได้"
          );
          return;
        }

        const data = result.data;
        const analysis = data.ai_analysis;

        const priorityClass =
          normalizePriorityClass(
            analysis?.priority_class
          );

        const confidence =
          getConfidencePercent(
            analysis?.confidence_score
          );

        /* ===============================================
           GIS DATA
        =============================================== */

        const roadName =
          analysis?.road_name ||
          "ไม่ระบุชื่อถนน";

        const subdistrict =
          analysis?.admin_subdistrict ||
          "";

        const district =
          analysis?.admin_district ||
          "";

        const province =
          analysis?.admin_province ||
          "";

        const latitude =
          data.latitude;

        const longitude =
          data.longitude;

        /* ===============================================
           STATE
        =============================================== */

        setReport({
          ...data,

          reportId:
            `RPT-${data.id}`,

          title:
            roadName,

          priorityClass,

          priorityLabel:
            getPriorityLabel(
              priorityClass
            ),

          priority_status:
            getReportStatus(data),

          aiConfidence:
            confidence,

          aiResult:
            getPriorityLabel(
              priorityClass
            ),

          probaNormal:
            analysis?.proba_normal,

          probaWarning:
            analysis?.proba_warning,

          probaCritical:
            analysis?.proba_critical,

          /* GIS */

          roadName,

          subdistrict,

          district,

          province,

          latitude,

          longitude,

          /* Report */

          reporter:
            data.reporter_name ||
            "ไม่ระบุชื่อ",

          category:
            analysis?.road_type ||
            "Road Damage",

          createdDate:
            data.created_at
              ? formatActionDate(
                  data.created_at
                )
              : "-",

          updatedDate:
            data.updated_at
              ? formatActionDate(
                  data.updated_at
                )
              : "-",

          image:
            getReportImageUrl(data),

          actions:
            data.actions || [],

          history:
            data.actions || [],
        });
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError.message ||
              "ไม่สามารถโหลดรายงานได้"
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  /* =======================================================
     UPDATE STATUS
  ======================================================= */

  const handleStatusUpdated = (
    updatedData
  ) => {
    setReport((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        ...updatedData,

        priority_status:
          getReportStatus(
            updatedData
          ) ||
          prev.priority_status,

        actions:
          updatedData.actions ||
          prev.actions ||
          [],

        history:
          updatedData.actions ||
          prev.history ||
          [],
      };
    });
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.page,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Space
          direction="vertical"
          align="center"
        >
          <Spin size="large" />

          <Text type="secondary">
            กำลังโหลดข้อมูลรายงาน...
          </Text>
        </Space>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.page,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <Card
          bordered={false}
          style={{
            width: "100%",
            maxWidth: 500,
            borderRadius: 14,
            textAlign: "center",
          }}
        >
          <FileSearchOutlined
            style={{
              fontSize: 42,
              color: COLORS.danger,
              marginBottom: 16,
            }}
          />

          <Title level={4}>
            ไม่สามารถโหลดรายงานได้
          </Title>

          <Text type="danger">
            {error}
          </Text>

          <div style={{ marginTop: 20 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() =>
                navigate(-1)
              }
            >
              กลับไปหน้ารายงาน
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!report) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.page,
          padding: 40,
        }}
      >
        <Empty description="ไม่พบข้อมูลรายงาน" />
      </div>
    );
  }

  const priority =
    getPriorityConfig(
      report.priorityClass
    );

  return (
    <div
      className="admin-report-detail-page"
      style={{
        minHeight: "100vh",
        background: COLORS.page,
        padding:
          "18px 24px 40px",
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
        }}
      >
        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <div>
            <Button
              type="text"
              icon={
                <ArrowLeftOutlined />
              }
              onClick={() =>
                navigate(-1)
              }
              style={{
                paddingLeft: 0,
                color: COLORS.inkSoft,
                fontWeight: 600,
              }}
            >
              กลับไปรายงาน
            </Button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginTop: 2,
              }}
            >
              <FileSearchOutlined
                style={{
                  fontSize: 20,
                  color: COLORS.markDeep,
                }}
              />

              <Title
                level={3}
                style={{
                  margin: 0,
                  color: COLORS.ink,
                }}
              >
                รายละเอียดรายงาน
              </Title>
            </div>

            <Text
              type="secondary"
              style={{
                fontSize: 13,
              }}
            >
              ตรวจสอบข้อมูลรายงาน
              และผลการวิเคราะห์จาก AI
            </Text>
          </div>

          <Tag
            style={{
              margin: 0,
              border: "none",
              background: priority.bg,
              color: priority.color,
              padding:
                "5px 12px",
              borderRadius: 20,
              fontWeight: 600,
            }}
          >
            {priority.thai}
          </Tag>
        </div>

        {/* =================================================
            REPORT HEADER
        ================================================= */}

        <ReportHeader
          report={report}
        />

        {/* =================================================
            CONTENT
        ================================================= */}

        <Row
          gutter={[18, 18]}
          style={{
            marginTop: 18,
          }}
        >
          {/* =================================================
              LEFT
          ================================================= */}

          <Col xs={24} lg={16}>
            <Space
              direction="vertical"
              size={18}
              style={{
                width: "100%",
              }}
            >
              {/* =================================================
                  LOCATION
              ================================================= */}

              <Card
                bordered={false}
                style={{
                  borderRadius: 14,
                }}
                title={
                  <Space size={8}>
                    <EnvironmentOutlined
                      style={{
                        color:
                          COLORS.inkSoft,
                      }}
                    />

                    <span>
                      ตำแหน่งรายงาน
                    </span>
                  </Space>
                }
              >
                <div
                  style={{
                    background:
                      COLORS.paper,
                    border:
                      `1px solid ${COLORS.line}`,
                    borderRadius: 10,
                    padding:
                      "6px 16px",
                  }}
                >
                  <LocationRow
                    label="ถนน"
                    value={
                      report.roadName
                    }
                  />

                  <LocationRow
                    label="ตำบล"
                    value={
                      report.subdistrict
                    }
                  />

                  <LocationRow
                    label="อำเภอ"
                    value={
                      report.district
                    }
                  />

                  <LocationRow
                    label="จังหวัด"
                    value={
                      report.province
                    }
                  />

                  <LocationRow
                    label="Latitude"
                    value={
                      report.latitude
                    }
                    mono
                  />

                  <LocationRow
                    label="Longitude"
                    value={
                      report.longitude
                    }
                    mono
                  />
                </div>

                {/* ROAD TYPE */}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 14,
                  }}
                >
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 12,
                    }}
                  >
                    ประเภทถนน
                  </Text>

                  <Tag
                    style={{
                      margin: 0,
                    }}
                  >
                    {report.category}
                  </Tag>
                </div>
              </Card>

              {/* =================================================
                  REPORT INFO
              ================================================= */}

              <Card
                bordered={false}
                style={{
                  borderRadius: 14,
                }}
                title="ข้อมูลรายงาน"
              >
                <ReportInfoCard
                  report={report}
                />
              </Card>

              {/* =================================================
                  AI ANALYSIS
              ================================================= */}

              <Card
                bordered={false}
                style={{
                  borderRadius: 14,
                }}
                title={
                  <Space size={8}>
                    <RobotOutlined
                      style={{
                        color:
                          COLORS.inkSoft,
                      }}
                    />

                    <span>
                      ผลการวิเคราะห์จาก AI
                    </span>
                  </Space>
                }
              >
                {/* METRICS */}

                <div
                  className="ai-metrics"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3, 1fr)",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="AI Confidence"
                    value={
                      report.aiConfidence
                    }
                    suffix="%"
                  />

                  <Metric
                    label="Priority Class"
                    value={
                      priority.label
                    }
                  />

                  <Metric
                    label="AI Result"
                    value={
                      report.aiResult
                    }
                  />
                </div>

                <Divider
                  style={{
                    margin:
                      "20px 0",
                  }}
                />

                {/* PROBABILITY */}

                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      marginBottom: 14,
                    }}
                  >
                    <Text strong>
                      Probability
                    </Text>

                    <Text
                      type="secondary"
                      style={{
                        fontSize: 12,
                      }}
                    >
                      AI classification
                    </Text>
                  </div>

                  <ProbabilityBar
                    label="Normal"
                    value={
                      report.probaNormal
                    }
                    color={COLORS.ok}
                  />

                  <ProbabilityBar
                    label="Warning"
                    value={
                      report.probaWarning
                    }
                    color={COLORS.warn}
                  />

                  <ProbabilityBar
                    label="Critical"
                    value={
                      report.probaCritical
                    }
                    color={COLORS.danger}
                  />
                </div>
              </Card>

              {/* =================================================
                  IMAGE
              ================================================= */}

              <Card
                bordered={false}
                style={{
                  borderRadius: 14,
                }}
                title="ภาพรายงาน"
              >
                <ReportImage
                  image={
                    report.image
                  }
                />
              </Card>

              {/* =================================================
                  HISTORY
              ================================================= */}

              <Card
                bordered={false}
                style={{
                  borderRadius: 14,
                }}
                title={
                  <Space size={8}>
                    <ClockCircleOutlined
                      style={{
                        color:
                          COLORS.inkSoft,
                      }}
                    />

                    <span>
                      ประวัติการดำเนินการ
                    </span>
                  </Space>
                }
              >
                <StatusTimeline
                  actions={
                    report.actions
                  }
                  history={
                    report.history
                  }
                />
              </Card>
            </Space>
          </Col>

          {/* =================================================
              RIGHT
          ================================================= */}

          <Col xs={24} lg={8}>
            <div
              className="report-action-sticky"
              style={{
                position: "sticky",
                top: 18,
              }}
            >
              <Card
                bordered={false}
                style={{
                  borderRadius: 14,
                  borderTop:
                    `3px solid ${COLORS.mark}`,
                }}
                title={
                  <Space size={8}>
                    <CheckCircleOutlined
                      style={{
                        color:
                          COLORS.inkSoft,
                      }}
                    />

                    <span>
                      การดำเนินการ
                    </span>
                  </Space>
                }
              >
                <ActionPanel
                  report={report}
                  onStatusChange={
                    handleStatusUpdated
                  }
                />
              </Card>

              {/* META */}

              <div
                style={{
                  marginTop: 12,
                  padding:
                    "12px 14px",
                  borderRadius: 10,
                  background:
                    COLORS.white,
                  border:
                    `1px solid ${COLORS.line}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    marginBottom: 7,
                  }}
                >
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 12,
                    }}
                  >
                    Report ID
                  </Text>

                  <Text
                    strong
                    style={{
                      fontSize: 12,
                      fontFamily:
                        "monospace",
                    }}
                  >
                    {report.reportId}
                  </Text>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                  }}
                >
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 12,
                    }}
                  >
                    อัปเดตล่าสุด
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                    }}
                  >
                    {report.updatedDate}
                  </Text>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* =====================================================
          RESPONSIVE
      ===================================================== */}

      <style>{`
        @media (max-width: 991px) {
          .report-action-sticky {
            position: static !important;
          }
        }

        @media (max-width: 700px) {
          .ai-metrics {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 600px) {
          .admin-report-detail-page {
            padding: 14px 12px 30px !important;
          }
        }

        @media (max-width: 480px) {
          .admin-report-detail-page .ant-card-head {
            padding: 0 16px;
          }

          .admin-report-detail-page .ant-card-body {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminReportDetail;