import { Table, Tag, Progress, Button, Dropdown, Space } from "antd";
import {
    MoreOutlined,
    EyeOutlined,
    UserAddOutlined,
    CheckCircleOutlined,
} from "@ant-design/icons";

import { useNavigate } from "react-router-dom";
import { getConfidencePercent, getPriorityLabel, normalizePriorityClass } from "../../utils/priorityMapping";


const ReportsTable = ({ reports = [], loading = false }) => {
    const tableData = reports.map((report) => ({
        ...report,
        reportId: `RPT-${report.id}`,
        roadName: report.ai_analysis?.road_name || "ไม่ระบุชื่อถนน",
        damageType: getPriorityLabel(report.ai_analysis?.priority_class),
        priorityClass: normalizePriorityClass(report.ai_analysis?.priority_class),
        confidenceScore: getConfidencePercent(report.ai_analysis?.confidence_score),
        status: report.status,
        reportDate: report.created_at
            ? new Date(report.created_at).toLocaleDateString("th-TH")
            : "-",
    }));
    const navigate = useNavigate();

    const getStatusColor = (status) => {
        switch (status) {
            case "pending":
                return "gold";

            case "processing":
                return "blue";

            case "completed":
                return "green";

            case "rejected":
                return "red";

            default:
                return "default";
        }
    };

    const menuItems = (record) => [
        {
            key: "assign",

            icon: <UserAddOutlined />,

            label: "Assign Engineer",

            onClick: () => {
                console.log("Assign", record);
            },
        },

        {
            key: "complete",

            icon: <CheckCircleOutlined />,

            label: "Mark as Completed",

            disabled: record.status === "Completed",

            onClick: () => {
                console.log("Complete", record);
            },
        },
    ];

    const columns = [
        {
            title: "Report ID",

            dataIndex: "reportId",

            key: "reportId",

            width: 120,
        },

        {
            title: "Road",

            dataIndex: "roadName",

            key: "roadName",
        },

        {
            title: "Priority Class",

            dataIndex: "damageType",

            key: "damageType",

            width: 230,

            render: (label, record) => (
                <Tag
                    color={
                        record.priorityClass === 1
                            ? "green"
                            : record.priorityClass === 2
                            ? "orange"
                            : record.priorityClass === 3
                            ? "red"
                            : "default"
                    }
                >
                    {label}
                </Tag>
            ),
        },

        {
            title: "AI Confidence",

            dataIndex: "confidenceScore",

            key: "confidenceScore",

            width: 180,

            render: (score) => (
                <Space
                    direction="vertical"
                    style={{
                        width: "100%",
                    }}
                    size={2}
                >
                    <b>{score === null ? "-" : `${score}%`}</b>

                    <Progress
                        percent={score || 0}
                        showInfo={false}
                        strokeColor="#1677ff"
                    />
                </Space>
            ),
        },

        {
            title: "Status",

            dataIndex: "status",

            key: "status",

            width: 150,

            render: (status) => (
                <Tag color={getStatusColor(status)}>{status}</Tag>
            ),
        },

        {
            title: "Reported Date",

            dataIndex: "reportDate",

            key: "reportDate",

            width: 150,
        },

        {
            title: "Action",

            key: "action",

            width: 170,

            fixed: "right",

            render: (_, record) => (
                <Space>
                    {/* View Detail */}

                    <Button
                        type="primary"
                        icon={<EyeOutlined />}
                        onClick={() => {
                            navigate(`/admin/reports/${record.id}`);
                        }}
                    >
                        View
                    </Button>

                    {/* More Action */}

                    <Dropdown
                        menu={{
                            items: menuItems(record),
                        }}
                        trigger={["click"]}
                    >
                        <Button icon={<MoreOutlined />} />
                    </Dropdown>
                </Space>
            ),
        },
    ];

    return (
        <Table
            rowKey="id"
            columns={columns}
            dataSource={tableData}
            loading={loading}
            scroll={{
                x: 1200,
            }}
            pagination={{
                pageSize: 8,

                showSizeChanger: false,
            }}
        />
    );
};

export default ReportsTable;
