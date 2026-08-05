import {
    Row,
    Col,
    Card,
    Typography,
    Space,
    Button,
    Tag,
    Progress,
    Descriptions,
} from "antd";

import { useParams, useNavigate } from "react-router-dom";

import {
    FileSearchOutlined,
    ArrowLeftOutlined,
    RobotOutlined,
    SafetyCertificateOutlined,
} from "@ant-design/icons";

import priorityReportMock from "../mock/priorityReportMock";

import ReportHeader from "../components/admin-priority/admin-prioritydetail/ReportHeader";
import ReportInfoCard from "../components/admin-priority/admin-prioritydetail/ReportInfoCard";
import ReportImage from "../components/admin-priority/admin-prioritydetail/ReportImage";
import StatusTimeline from "../components/admin-priority/admin-prioritydetail/StatusTimeline";
import ActionPanel from "../components/admin-priority/admin-prioritydetail/ActionPanel";

const { Title, Text } = Typography;

const AdminReportDetail = () => {
    const { id } = useParams();

    const navigate = useNavigate();

    const report = priorityReportMock.find((item) => String(item.id) === id);

    if (!report) {
        return (
            <Card>
                <Title level={3}>Report not found</Title>
            </Card>
        );
    }

    return (
        <div
            style={{
                padding: 24,

                background: "#f5f7fa",

                minHeight: "100vh",
            }}
        >
            {/* PAGE HEADER */}

            <Card
                bordered={false}
                style={{
                    borderRadius: 16,
                }}
            >
                <Space direction="vertical" size={12}>
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate(-1)}
                    >
                        Back
                    </Button>

                    <Space>
                        <FileSearchOutlined
                            style={{
                                fontSize: 32,

                                color: "#1677ff",
                            }}
                        />

                        <div>
                            <Title
                                level={3}
                                style={{
                                    margin: 0,
                                }}
                            >
                                Road Report Detail
                            </Title>

                            <Text type="secondary">
                                ตรวจสอบข้อมูลรายงาน วิเคราะห์ด้วย AI
                                และผลยืนยันจากวิศวกร
                            </Text>
                        </div>
                    </Space>
                </Space>
            </Card>

            {/* REPORT HEADER */}

            <div
                style={{
                    marginTop: 20,
                }}
            >
                <ReportHeader report={report} />
            </div>

            <Row
                gutter={[20, 20]}
                style={{
                    marginTop: 20,
                }}
            >
                {/* LEFT */}

                <Col xs={24} lg={16}>
                    <Space
                        direction="vertical"
                        size={20}
                        style={{
                            width: "100%",
                        }}
                    >
                        {/* BASIC INFO */}

                        <Card
                            bordered={false}
                            title="ข้อมูลรายงาน"
                            style={{
                                borderRadius: 16,
                            }}
                        >
                            <ReportInfoCard report={report} />
                        </Card>

                        {/* AI ANALYSIS */}

                        <Card
                            bordered={false}
                            title={
                                <Space>
                                    <RobotOutlined
                                        style={{
                                            color: "#1677ff",
                                        }}
                                    />
                                    ผลวิเคราะห์จาก AI
                                </Space>
                            }
                            style={{
                                borderRadius: 16,
                            }}
                        >
                            <Descriptions column={1} bordered>
                                <Descriptions.Item label="AI Confidence">
                                    <Progress percent={report.aiConfidence} />
                                </Descriptions.Item>

                                <Descriptions.Item label="Priority Score">
                                    <Tag color="red">
                                        {report.priorityScore}
                                    </Tag>
                                </Descriptions.Item>

                                <Descriptions.Item label="GEE Score">
                                    <Progress
                                        percent={report.gee}
                                        strokeColor="#13c2c2"
                                    />
                                </Descriptions.Item>

                                <Descriptions.Item label="AI Result">
                                    {report.aiResult}
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>

                        {/* ENGINEER VERIFY */}

                        <Card
                            bordered={false}
                            title={
                                <Space>
                                    <SafetyCertificateOutlined
                                        style={{
                                            color: "#52c41a",
                                        }}
                                    />
                                    ผลยืนยันจากวิศวกร
                                </Space>
                            }
                            style={{
                                borderRadius: 16,
                            }}
                        >
                            <Descriptions column={1} bordered>
                                <Descriptions.Item label="Engineer">
                                    {report.engineer}
                                </Descriptions.Item>

                                <Descriptions.Item label="Verification Status">
                                    <Tag color="green">
                                        {report.verificationStatus}
                                    </Tag>
                                </Descriptions.Item>

                                <Descriptions.Item label="Confirmed Damage">
                                    {report.confirmedDamage}
                                </Descriptions.Item>

                                <Descriptions.Item label="Engineer Remark">
                                    {report.engineerRemark}
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>

                        {/* IMAGE */}

                        <Card
                            bordered={false}
                            title="Report Image"
                            style={{
                                borderRadius: 16,
                            }}
                        >
                            <ReportImage image={report.image} />
                        </Card>

                        {/* HISTORY */}

                        <Card
                            bordered={false}
                            title="Status History"
                            style={{
                                borderRadius: 16,
                            }}
                        >
                            <StatusTimeline history={report.history} />
                        </Card>
                    </Space>
                </Col>

                {/* RIGHT */}

                <Col xs={24} lg={8}>
                    <Space
                        direction="vertical"
                        size={20}
                        style={{
                            width: "100%",
                        }}
                    >
                        <Card
                            bordered={false}
                            title="Report Action"
                            style={{
                                borderRadius: 16,
                            }}
                        >
                            <ActionPanel report={report} />
                        </Card>
                    </Space>
                </Col>
            </Row>
        </div>
    );
};

export default AdminReportDetail;
