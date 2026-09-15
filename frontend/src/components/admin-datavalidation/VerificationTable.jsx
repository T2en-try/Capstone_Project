import { useState } from "react";
import {
  Button,
  Progress,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";

import {
  EyeOutlined,
  RobotOutlined,
} from "@ant-design/icons";

import VerificationDrawer from "./VerificationDetailDrawer";

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
   Priority
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
        label: "ยังไม่มีผล",
        thaiLabel: "ยังไม่มีผล",
        color: COLORS.neutral,
        background: "#F5F7F6",
      };
  }
};

/* =========================================================
   Status
========================================================= */

const getStatusConfig = (status) => {
  switch (status) {
    case "VERIFIED":
      return {
        label: "วิเคราะห์แล้ว",
        color: COLORS.ok,
        background: "#F1F8F5",
      };

    case "WAITING":
      return {
        label: "รอตรวจสอบ",
        color: COLORS.warn,
        background: "#FFF9E8",
      };

    case "REJECTED":
      return {
        label: "ปฏิเสธ",
        color: COLORS.danger,
        background: "#FFF3F0",
      };

    default:
      return {
        label: "ไม่ทราบสถานะ",
        color: COLORS.neutral,
        background: "#F5F7F6",
      };
  }
};

/* =========================================================
   Decision
========================================================= */

const getDecisionConfig = (decision) => {
  switch (decision) {
    case "Critical":
      return {
        color: COLORS.danger,
        background: "#FFF3F0",
      };

    case "Warning":
      return {
        color: COLORS.warn,
        background: "#FFF9E8",
      };

    case "Good":
    case "Good (สภาพปกติ)":
      return {
        color: COLORS.ok,
        background: "#F1F8F5",
      };

    default:
      return {
        color: COLORS.neutral,
        background: "#F5F7F6",
      };
  }
};

/* =========================================================
   Priority Badge
========================================================= */

function PriorityBadge({ value }) {
  const config =
    getPriorityConfig(value);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 30,
        height: 28,
        padding: "0 8px",
        borderRadius: 6,
        background: config.background,
        border: `1px solid ${config.color}`,
        color: config.color,
        fontFamily: "monospace",
        fontSize: 13,
        fontWeight: 700,
      }}
      title={`Priority Class ${value ?? "-"}`}
    >
      {value ?? "-"}
    </span>
  );
}

/* =========================================================
   Verification Table
========================================================= */

export default function VerificationTable({
  reports = [],
}) {
  const [
    selectedReport,
    setSelectedReport,
  ] = useState(null);

  const [
    drawerOpen,
    setDrawerOpen,
  ] = useState(false);

  /* =======================================================
     Open Detail
  ======================================================= */

  const openDetail = (record) => {
    setSelectedReport(record);
    setDrawerOpen(true);
  };

  /* =======================================================
     Columns
  ======================================================= */

  const columns = [
    {
      title: "Report",
      dataIndex: "reportId",
      key: "reportId",
      width: 105,
      fixed: "left",

      render: (value) => (
        <span
          style={{
            color: COLORS.ink,
            fontFamily: "monospace",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          #{value}
        </span>
      ),
    },

    {
      title: "ถนน / พื้นที่",
      key: "road",
      width: 240,

      render: (_, record) => (
        <div
          style={{
            minWidth: 0,
          }}
        >
          <Text
            strong
            ellipsis={{
              tooltip: record.roadName,
            }}
            style={{
              display: "block",
              color: COLORS.ink,
              fontFamily:
                "Sarabun, sans-serif",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {record.roadName}
          </Text>

          <Text
            ellipsis={{
              tooltip: record.district,
            }}
            style={{
              display: "block",
              color: COLORS.neutral,
              fontFamily:
                "Sarabun, sans-serif",
              fontSize: 12,
            }}
          >
            {record.district}
          </Text>
        </div>
      ),
    },

    {
      title: "ผล AI",
      dataIndex: "aiDecision",
      key: "aiDecision",
      width: 130,

      render: (value) => {
        const config =
          getDecisionConfig(value);

        return (
          <Tag
            style={{
              margin: 0,
              padding: "3px 9px",
              borderRadius: 5,
              borderColor: config.color,
              background: config.background,
              color: config.color,
              fontFamily:
                "Sarabun, sans-serif",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {value || "ยังไม่มีผล"}
          </Tag>
        );
      },
    },

    {
      title: "Confidence",
      dataIndex: "confidence",
      key: "confidence",
      width: 170,

      render: (value) => {
        const percent =
          value == null
            ? 0
            : Math.max(
                0,
                Math.min(
                  100,
                  Number(value)
                )
              );

        return (
          <div
            style={{
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Progress
                percent={percent}
                showInfo={false}
                size="small"
                strokeColor={
                  percent >= 80
                    ? COLORS.ok
                    : percent >= 60
                    ? COLORS.warn
                    : COLORS.danger
                }
                trailColor="#E8EFEC"
                style={{
                  flex: 1,
                  margin: 0,
                }}
              />

              <span
                style={{
                  minWidth: 38,
                  textAlign: "right",
                  color: COLORS.ink,
                  fontFamily: "monospace",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {value == null
                  ? "-"
                  : `${Math.round(
                      percent
                    )}%`}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      title: "สถานะ",
      dataIndex: "verificationStatus",
      key: "verificationStatus",
      width: 135,

      render: (status) => {
        const config =
          getStatusConfig(status);

        return (
          <Tag
            style={{
              margin: 0,
              padding: "3px 9px",
              borderRadius: 5,
              borderColor: config.color,
              background: config.background,
              color: config.color,
              fontFamily:
                "Sarabun, sans-serif",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {config.label}
          </Tag>
        );
      },
    },

    {
      title: "วันที่รายงาน",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 165,

      render: (value) => (
        <span
          style={{
            color: COLORS.neutral,
            fontFamily:
              "Sarabun, sans-serif",
            fontSize: 12,
            whiteSpace: "nowrap",
          }}
        >
          {value || "-"}
        </span>
      ),
    },

    {
      title: "",
      key: "action",
      width: 115,
      align: "right",
      fixed: "right",

      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() =>
            openDetail(record)
          }
          style={{
            height: 32,
            borderRadius: 6,
            borderColor: COLORS.line,
            color: COLORS.ink,
            background: COLORS.white,
            fontFamily:
              "Sarabun, sans-serif",
          }}
        >
          ดูรายละเอียด
        </Button>
      ),
    },
  ];

  /* =======================================================
     Empty State
  ======================================================= */

  const emptyText = (
    <div
      style={{
        padding: "45px 20px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          margin: "0 auto 10px",
          borderRadius: 9,
          display: "flex",
          alignItems: "center",
          justifyContent:
            "center",
          background: COLORS.paper,
          border: `1px solid ${COLORS.line}`,
          color: COLORS.markDeep,
          fontSize: 19,
        }}
      >
        <RobotOutlined />
      </div>

      <Text
        strong
        style={{
          display: "block",
          color: COLORS.ink,
          fontFamily:
            "Kanit, sans-serif",
          fontSize: 16,
        }}
      >
        ไม่พบรายการตรวจสอบ
      </Text>

      <Text
        type="secondary"
        style={{
          fontFamily:
            "Sarabun, sans-serif",
          fontSize: 13,
        }}
      >
        ลองเปลี่ยนเงื่อนไขตัวกรอง
      </Text>
    </div>
  );

  /* =======================================================
     Render
  ======================================================= */

  return (
    <>
      <div
        style={{
          borderTop:
            `1px solid ${COLORS.line}`,
          borderBottom:
            `1px solid ${COLORS.line}`,
          background:
            COLORS.white,
        }}
      >
        {/* ── Desktop View ── */}
        <div className="hidden md:block">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={reports}
            locale={{
              emptyText,
            }}
            scroll={{
              x: 1050,
            }}
            pagination={{
              pageSize: 8,
              showSizeChanger: true,
              pageSizeOptions: [
                "8",
                "16",
                "32",
                "50",
              ],
              showTotal: (
                total,
                range
              ) =>
                `แสดง ${range[0]}-${range[1]} จาก ${total} รายการ`,
              position: [
                "bottomRight",
              ],
            }}
            size="middle"
            rowClassName={() =>
              "ai-verification-row"
            }
          />
        </div>

        {/* ── Mobile View ── */}
        <div className="block md:hidden p-4 space-y-4">
          {reports.length === 0 ? (
            emptyText
          ) : (
            reports.map((report) => {
              const decisionConf = getDecisionConfig(report.aiDecision);
              return (
                <div 
                  key={report.id} 
                  className="border border-line rounded-xl p-4 bg-white shadow-sm flex flex-col gap-3"
                  onClick={() => openDetail(report)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-semibold text-ink text-sm">#{report.reportId}</span>
                      <Text strong ellipsis={{ tooltip: report.roadName }} className="block text-ink text-sm mt-1">
                        {report.roadName}
                      </Text>
                      <Text className="block text-asphalt/60 text-xs">
                        {report.district}
                      </Text>
                    </div>
                    <PriorityBadge value={report.aiPriorityClass} />
                  </div>

                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-asphalt/70">ผล AI:</span>
                      <Tag style={{ margin: 0, background: decisionConf.background, color: decisionConf.color, border: 'none' }}>
                        {report.aiDecision || "-"}
                      </Tag>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-asphalt/70">Confidence:</span>
                      <div className="w-1/2 flex items-center gap-2">
                        <Progress 
                          percent={Number(report.aiConfidence).toFixed(0)} 
                          size="small" 
                          strokeColor={COLORS.mark} 
                          trailColor="#E4EBE8"
                          format={(p) => <span className="text-xs text-ink">{p}%</span>}
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="default" size="small" block className="mt-2" onClick={(e) => { e.stopPropagation(); openDetail(report); }}>
                    ตรวจสอบ
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* =================================================
          Detail Drawer
      ================================================= */}

      <VerificationDrawer
        open={drawerOpen}
        report={selectedReport}
        onClose={() =>
          setDrawerOpen(false)
        }
      />

      {/* =================================================
          Table Row Styling
      ================================================= */}

      <style>
        {`
          .ai-verification-row {
            transition: background 0.15s ease;
          }

          .ai-verification-row:hover > td {
            background: #F7FAF8 !important;
          }

          .ant-table-thead > tr > th {
            background: #F7FAF8 !important;
            color: #14352F !important;
            font-family: Sarabun, sans-serif !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            border-bottom: 1px solid #C5D4CF !important;
          }

          .ant-table-tbody > tr > td {
            border-bottom: 1px solid #E4EBE8 !important;
            color: #2A3431;
            font-family: Sarabun, sans-serif;
          }

          .ant-table-pagination {
            margin: 14px 0 !important;
          }

          .ant-pagination-item-active {
            border-color: #E6A817 !important;
          }

          .ant-pagination-item-active a {
            color: #C48A0A !important;
          }
        `}
      </style>
    </>
  );
}