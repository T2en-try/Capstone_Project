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

import { useEffect, useState } from "react";
import { fetchReportById, getReportImageUrl } from "../services/dashboardService";

import ReportHeader from "../components/admin-priority/admin-prioritydetail/ReportHeader";
import ReportInfoCard from "../components/admin-priority/admin-prioritydetail/ReportInfoCard";
import ReportImage from "../components/admin-priority/admin-prioritydetail/ReportImage";
import StatusTimeline from "../components/admin-priority/admin-prioritydetail/StatusTimeline";
import ActionPanel from "../components/admin-priority/admin-prioritydetail/ActionPanel";

const { Title, Text } = Typography;

const AdminReportDetail = () => {
    const { id } = useParams();

    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;

        fetchReportById(id)
            .then((result) => {
                if (!active) return;
                if (!result.success) {
                    setError(result.error || "ไม่สามารถโหลดรายงานได้");
                    return;
                }

                const data = result.data;
                const analysis = data.ai_analysis;
                const score = Math.round(
                    Math.max(0, Math.min(1, Number(analysis?.final_fusion_score ?? 0))) * 100
                );
                const confidence = Math.round(
                    Math.max(0, Math.min(1, Number(analysis?.confidence_score ?? 0))) * 100
                );

                setReport({
                    ...data,
                    reportId: `RPT-${data.id}`,
                    title: analysis?.road_name || `รายงานปัญหาถนน #${data.id}`,
                    priorityScore: score,
                    gee: Math.round(Number(analysis?.community_impact_score_pi ?? 0)),
                    aiConfidence: confidence,
                    aiResult: analysis?.final_decision || "ยังไม่มีผลวิเคราะห์",
                    engineer: "ยังไม่มีข้อมูล",
                    verificationStatus: "รอการตรวจสอบ",
                    confirmedDamage: "ยังไม่มีข้อมูลการยืนยัน",
                    engineerRemark: "ยังไม่มีหมายเหตุจากวิศวกร",
                    reporter: data.reporter_name || "ไม่ระบุชื่อ",
                    location: analysis?.road_name || `${data.latitude ?? "-"}, ${data.longitude ?? "-"}`,
                    category: analysis?.road_type || "Road Damage",
                    createdDate: data.created_at
                        ? new Date(data.created_at).toLocaleString("th-TH")
                        : "-",
                    updatedDate: data.updated_at
                        ? new Date(data.updated_at).toLocaleString("th-TH")
                        : "-",
                    image: getReportImageUrl(data),
                    history: [
                        {
                            title: "Report Submitted",
                            date: data.created_at
                                ? new Date(data.created_at).toLocaleString("th-TH")
                                : "-",
                        },
                    ],
                });
            })
            .catch((loadError) => {
                if (active) setError(loadError.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [id]);

    if (loading) {
        return <Card>กำลังโหลดข้อมูลรายงาน...</Card>;
    }

    if (error) {
        return <Card><Title level={3}>ไม่สามารถโหลดรายงานได้</Title><Text type="danger">{error}</Text></Card>;
    }

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
