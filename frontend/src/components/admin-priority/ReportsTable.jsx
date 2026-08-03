import { Table, Tag, Progress, Button, Dropdown, Space } from "antd";
import {
    MoreOutlined,
    EyeOutlined,
    UserAddOutlined,
    CheckCircleOutlined,
} from "@ant-design/icons";

import { useNavigate } from "react-router-dom";

import priorityReportMock from "../../mock/priorityReportMock";

const ReportsTable = () => {
    const navigate = useNavigate();

    const getPriorityColor = (score) => {
        if (score >= 90) return "#ff4d4f";
        if (score >= 70) return "#fa8c16";
        if (score >= 50) return "#faad14";

        return "#52c41a";
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "Pending":
                return "gold";

            case "Processing":
                return "blue";

            case "Completed":
                return "green";

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
            title: "Damage",

            dataIndex: "damageType",

            key: "damageType",

            width: 170,
        },

        {
            title: "Priority Score",

            dataIndex: "priorityScore",

            key: "priorityScore",

            width: 180,

            render: (score) => (
                <Space
                    direction="vertical"
                    style={{
                        width: "100%",
                    }}
                    size={2}
                >
                    <b>{score}</b>

                    <Progress
                        percent={score}
                        showInfo={false}
                        strokeColor={getPriorityColor(score)}
                    />
                </Space>
            ),
        },

        {
            title: "GEE",

            dataIndex: "gee",

            key: "gee",

            width: 120,

            render: (gee) => <Progress percent={gee} size="small" />,
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
            dataSource={priorityReportMock}
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
