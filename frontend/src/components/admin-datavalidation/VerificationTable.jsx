import { useState } from "react";
import VerificationDrawer from "./VerificationDetailDrawer";
import { Button, Progress, Space, Table, Tag } from "antd";

import {
  EyeOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

import aiVerificationMock from "../../mock/aiVerificationMock";

export default function VerificationTable() {
const [selectedReport, setSelectedReport] = useState(null);

const [drawerOpen, setDrawerOpen] = useState(false);

  const getDecisionColor = (decision) => {

    switch (decision) {

      case "Critical":
        return "red";

      case "Warning":
        return "orange";

      case "Moderate":
        return "gold";

      case "Low":
        return "green";

      default:
        return "default";

    }

  };



  const getStatusColor = (status) => {

    switch (status) {

      case "WAITING":
        return "processing";

      case "VERIFIED":
        return "success";

      case "CORRECTED":
        return "warning";

      default:
        return "default";

    }

  };



  const columns = [

    {
      title: "Report",

      dataIndex: "reportId",

      width: 120,
    },



    {
      title: "Road",

      dataIndex: "roadName",
    },



    {
      title: "AI Decision",

      dataIndex: "aiDecision",

      render: (value) => (

        <Tag color={getDecisionColor(value)}>

          {value}

        </Tag>

      ),
    },



    {
      title: "Confidence",

      dataIndex: "confidence",

      render: (value) => (

        <Progress

          percent={value}

          size="small"

          showInfo

        />

      ),

      width: 170,
    },



    {
      title: "Fusion",

      dataIndex: "fusionScore",

      align: "center",

      width: 100,
    },



    {
      title: "Status",

      dataIndex: "verificationStatus",

      render: (status) => (

        <Tag color={getStatusColor(status)}>

          {status}

        </Tag>

      ),

      width: 140,
    },



    {
      title: "Created",

      dataIndex: "createdAt",

      width: 180,
    },



    {

      title: "Action",

      key: "action",

      width: 140,

      render: (_, record) => (

        <Space>

         <Button
  type="primary"
  icon={
    record.verificationStatus === "WAITING"
      ? <CheckCircleOutlined />
      : <EyeOutlined />
  }
  onClick={() => {
    setSelectedReport(record);
    setDrawerOpen(true);
  }}
>

            {

              record.verificationStatus === "WAITING"

                ? "Review"

                : "View"

            }

          </Button>

        </Space>

      )

    }

  ];



  return (
  <>
    <Table
      rowKey="id"
      columns={columns}
      dataSource={aiVerificationMock}
      pagination={{
        pageSize: 8,
      }}
    />

    <VerificationDrawer
      open={drawerOpen}
      report={selectedReport}
      onClose={() => setDrawerOpen(false)}
      onConfirm={(result) => {
        console.log("Verification Result:", result);

        setDrawerOpen(false);
      }}
    />
  </>
);

}