import { useState } from "react";
import {
  Button,
  Progress,
  Table,
  Tag,
  Typography,
  Tooltip,
} from "antd";

import {
  EyeOutlined,
  RobotOutlined,
} from "@ant-design/icons";

import VerificationDrawer from "./VerificationDetailDrawerEN";

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
        color: COLORS.danger,
        background: "#FFF3F0",
      };

    case 2:
      return {
        label: "Warning",
        color: COLORS.warn,
        background: "#FFF9E8",
      };

    case 1:
      return {
        label: "Good",
        color: COLORS.ok,
        background: "#F1F8F5",
      };

    default:
      return {
        label: "No Result",
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
        label: "Verified",
        color: COLORS.ok,
        background: "#F1F8F5",
      };

    case "WAITING":
      return {
        label: "Waiting for Review",
        color: COLORS.warn,
        background: "#FFF9E8",
      };

    case "REJECTED":
      return {
        label: "Rejected",
        color: COLORS.danger,
        background: "#FFF3F0",
      };

    default:
      return {
        label: "Unknown Status",
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

  // Mobile pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

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
      title: "Road / Area",
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
              fontFamily: "Sarabun, sans-serif",
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
              fontFamily: "Sarabun, sans-serif",
              fontSize: 12,
            }}
          >
            {record.district}
          </Text>
        </div>
      ),
    },

    {
      title: "AI Decision",
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
              fontFamily: "Sarabun, sans-serif",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {value || "No Result"}
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
      title: "Status",
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
      title: "Report Date",
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
        <Tooltip title="View Details">
          <Button
            type="text"
            icon={
              <EyeOutlined
                style={{
                  color: "#64748B",
                }}
              />
            }
            onClick={() =>
              openDetail(record)
            }
          />
        </Tooltip>
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
          justifyContent: "center",
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
          fontFamily: "Kanit, sans-serif",
          fontSize: 16,
        }}
      >
        No verification reports found
      </Text>

      <Text
        type="secondary"
        style={{
          fontFamily:
            "Sarabun, sans-serif",
          fontSize: 13,
        }}
      >
        Try changing the filter criteria
      </Text>
    </div>
  );

  /* =======================================================
     Mobile Pagination
  ======================================================= */

  const totalPages =
    Math.ceil(
      reports.length / PAGE_SIZE
    ) || 1;

  const mobileReports = reports.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  /* =======================================================
     Render
  ======================================================= */

  return (
    <>
      {/* ── Desktop View ── */}

      <div className="hidden md:block w-full bg-white rounded-xl shadow-sm border border-line overflow-hidden mt-4">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={reports}
          locale={{
            emptyText,
          }}
          className="modern-dashboard-table"
          scroll={{ x: 1050 }}
          pagination={{
            pageSize: 5,
            showSizeChanger: false,
            showTotal: (
              total,
              range
            ) =>
              `Showing ${range[0]}-${range[1]} of ${total}`,
            position: ["bottomRight"],
          }}
          size="middle"
          rowClassName={() =>
            "ai-verification-row"
          }
        />
      </div>

      {/* ── Mobile View ── */}

      <div className="block md:hidden mt-4">
        <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden">
          {reports.length === 0 ? (
            emptyText
          ) : (
            <div>
              {mobileReports.map(
                (report) => {
                  const decisionConf =
                    getDecisionConfig(
                      report.aiDecision
                    );

                  return (
                    <div
                      key={report.id}
                      className="border-b border-line p-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                      onClick={() =>
                        openDetail(report)
                      }
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-ink text-sm">
                            #{report.reportId}
                          </span>

                          <PriorityBadge
                            value={
                              report.priorityClass
                            }
                          />
                        </div>

                        <p className="text-sm font-semibold text-ink truncate">
                          {report.roadName}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-asphalt/60 mt-1">
                          <span
                            style={{
                              color:
                                decisionConf.color,
                            }}
                          >
                            {report.aiDecision ||
                              "No Result"}
                          </span>

                          <span className="text-gray-300">
                            •
                          </span>

                          <span>
                            Conf:{" "}
                            {report.confidence ==
                            null
                              ? "-"
                              : `${Number(
                                  report.confidence
                                ).toFixed(
                                  0
                                )}%`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="text"
                          icon={
                            <EyeOutlined
                              style={{
                                color:
                                  "#64748B",
                              }}
                            />
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(
                              report
                            );
                          }}
                          className="w-8 h-8 flex items-center justify-center p-0"
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* Mobile Pagination */}

        {reports.length > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={() =>
                setCurrentPage(
                  (p) =>
                    Math.max(
                      1,
                      p - 1
                    )
                )
              }
              disabled={
                currentPage === 1
              }
              className="w-8 h-8 rounded-lg border border-line text-sm text-ink disabled:opacity-30 disabled:cursor-not-allowed bg-white flex items-center justify-center"
            >
              &lt;
            </button>

            <span className="text-sm text-asphalt/70 font-medium">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() =>
                setCurrentPage(
                  (p) =>
                    Math.min(
                      totalPages,
                      p + 1
                    )
                )
              }
              disabled={
                currentPage >=
                totalPages
              }
              className="w-8 h-8 rounded-lg border border-line text-sm text-ink disabled:opacity-30 disabled:cursor-not-allowed bg-white flex items-center justify-center"
            >
              &gt;
            </button>
          </div>
        )}
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