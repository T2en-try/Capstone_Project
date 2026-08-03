import { useNavigate } from "react-router-dom";

import { Button, Card, List, Progress, Space, Tag, Typography } from "antd";

import {
    WarningOutlined,
    EnvironmentOutlined,
    ArrowRightOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const PriorityReports = ({ reports = [] }) => {
    const navigate = useNavigate();

    const severityConfig = {
        Critical: {
            color: "red",
            label: "Critical",
        },

        High: {
            color: "orange",
            label: "High",
        },

        Medium: {
            color: "gold",
            label: "Medium",
        },

        Low: {
            color: "green",
            label: "Low",
        },
    };

    const ranked = [...reports]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);

    return (
        <Card
            title={
                <Space>
                    <WarningOutlined
                        style={{
                            color: "#ff4d4f",
                        }}
                    />

                    <span>Priority Reports</span>
                </Space>
            }
            extra={
                <Button
                    type="link"
                    onClick={() => navigate("/admin/priority-reports")}
                >
                    View All
                    <ArrowRightOutlined />
                </Button>
            }
            style={{
                borderRadius: 16,

                height: 650,
            }}
            bodyStyle={{
                padding: "8px 16px",

                height: "calc(100% - 60px)",

                overflow: "hidden",
            }}
        >
            <List
                dataSource={ranked}
                style={{
                    height: "100%",

                    overflowY: "auto",

                    paddingRight: 5,
                }}
                renderItem={(item, index) => (
                    <List.Item
                        style={{
                            padding: "14px 8px",

                            borderRadius: 12,

                            transition: "0.2s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f5f5f5";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                        }}
                    >
                        <div
                            style={{
                                display: "flex",

                                width: "100%",

                                gap: 12,
                            }}
                        >
                            {/* Rank */}

                            <div
                                style={{
                                    width: 38,

                                    height: 38,

                                    borderRadius: "50%",

                                    background:
                                        index === 0 ? "#fff1f0" : "#f5f5f5",

                                    display: "flex",

                                    justifyContent: "center",

                                    alignItems: "center",

                                    fontWeight: 700,
                                }}
                            >
                                #{index + 1}
                            </div>

                            {/* Content */}

                            <div
                                style={{
                                    flex: 1,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",

                                        justifyContent: "space-between",

                                        alignItems: "center",
                                    }}
                                >
                                    <Text
                                        strong
                                        ellipsis
                                        style={{
                                            maxWidth: 180,
                                        }}
                                    >
                                        {item.title}
                                    </Text>

                                    <Text
                                        strong
                                        style={{
                                            color: "#1677ff",

                                            fontSize: 16,
                                        }}
                                    >
                                        {item.confidence}%
                                    </Text>
                                </div>

                                <div
                                    style={{
                                        marginTop: 4,

                                        fontSize: 12,

                                        color: "#8c8c8c",
                                    }}
                                >
                                    <EnvironmentOutlined /> {item.location}
                                </div>

                                <Space
                                    style={{
                                        marginTop: 10,

                                        width: "100%",
                                    }}
                                >
                                    <Tag
                                        color={
                                            severityConfig[item.severity]?.color
                                        }
                                    >
                                        {severityConfig[item.severity]?.label}
                                    </Tag>

                                    <Progress
                                        percent={item.confidence}
                                        showInfo={false}
                                        size="small"
                                        style={{
                                            flex: 1,
                                        }}
                                    />
                                </Space>
                            </div>
                        </div>
                    </List.Item>
                )}
            />
        </Card>
    );
};

export default PriorityReports;
