import { useState } from "react";
import { Table, Tag, Progress, Button, Dropdown, Space, message, Modal, Input, Typography, Skeleton } from "antd";
import {
    MoreOutlined,
    EyeOutlined,
    SyncOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
} from "@ant-design/icons";

import { useNavigate } from "react-router-dom";
import { getConfidencePercent, getPriorityLabel, normalizePriorityClass } from "../../utils/priorityMapping";
import { updatePriorityStatus } from "../../services/dashboardService";
import { getReportStatus, getStatusColor, formatActionDate } from "../../utils/statusHelper";

const { Text } = Typography;


const ReportsTable = ({ reports = [], loading = false, onReportUpdated }) => {
    const navigate = useNavigate();

    // Modal State สำหรับการบันทึกสถานะพร้อม Note
    const [modalVisible, setModalVisible] = useState(false);
    const [activeRecord, setActiveRecord] = useState(null);
    const [targetStatus, setTargetStatus] = useState("");
    const [actionNote, setActionNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const tableData = reports.map((report) => ({
        ...report,
        reportId: `RPT-${report.id}`,
        roadName: report.ai_analysis?.road_name || "ไม่ระบุชื่อถนน",
        damageType: getPriorityLabel(report.ai_analysis?.priority_class),
        priorityClass: normalizePriorityClass(report.ai_analysis?.priority_class),
        confidenceScore: getConfidencePercent(report.ai_analysis?.confidence_score),
        priorityStatus: getReportStatus(report),
        reportDate: report.created_at
            ? formatActionDate(report.created_at)
            : "-",
    }));

    const handleOpenStatusModal = (record, newStatus) => {
        setActiveRecord(record);
        setTargetStatus(newStatus);
        setActionNote("");
        setModalVisible(true);
    };

    const handleConfirmStatusChange = async () => {
        if (!activeRecord?.id || !targetStatus) return;

        setSubmitting(true);
        try {
            const result = await updatePriorityStatus(activeRecord.id, targetStatus, actionNote);
            if (result.success) {
                message.success(`อัปเดตสถานะ RPT-${activeRecord.id} เป็น ${targetStatus} เรียบร้อยแล้ว`);
                setModalVisible(false);
                setActionNote("");
                if (onReportUpdated) {
                    onReportUpdated();
                }
            } else {
                message.error(result.error || "ไม่สามารถอัปเดตสถานะได้");
            }
        } catch (err) {
            message.error("เกิดข้อผิดพลาด: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const menuItems = (record) => [
        {
            key: "pending",
            icon: <ClockCircleOutlined />,
            label: "Mark as Pending",
            disabled: record.priorityStatus === "pending",
            onClick: () => handleOpenStatusModal(record, "pending"),
        },
        {
            key: "processing",
            icon: <SyncOutlined />,
            label: "Mark as Processing",
            disabled: record.priorityStatus === "processing",
            onClick: () => handleOpenStatusModal(record, "processing"),
        },
        {
            key: "completed",
            icon: <CheckCircleOutlined />,
            label: "Mark as Completed",
            disabled: record.priorityStatus === "completed",
            onClick: () => handleOpenStatusModal(record, "completed"),
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

            dataIndex: "priorityStatus",

            key: "priorityStatus",

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
                        <Button
                            icon={<MoreOutlined />}
                            loading={submitting && activeRecord?.id === record.id}
                        />
                    </Dropdown>
                </Space>
            ),
        },
    ];

    return (
        <>
            {/* ── Desktop View (Table) ── */}
            <div className="hidden md:block">
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
            </div>

            {/* ── Mobile View (Card List) ── */}
            <div className="block md:hidden space-y-4">
                {loading ? (
                    <div className="space-y-4 py-2">
                        <Skeleton active paragraph={{ rows: 2 }} />
                        <Skeleton active paragraph={{ rows: 2 }} />
                    </div>
                ) : tableData.length === 0 ? (
                    <div className="text-center text-asphalt/50 py-8">ไม่มีข้อมูล</div>
                ) : (
                    tableData.map((record) => (
                        <div key={record.id} className="bg-white border border-line rounded-xl p-4 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-ink text-sm">#{record.reportId}</h3>
                                    <p className="text-sm font-semibold text-ink mt-1 truncate max-w-[200px]">{record.roadName}</p>
                                    <p className="text-xs text-asphalt/70">{record.reportDate}</p>
                                </div>
                                <Tag color={getStatusColor(record.priorityStatus)} style={{ margin: 0 }}>
                                    {record.priorityStatus}
                                </Tag>
                            </div>

                            <div className="flex flex-col gap-2 mt-2 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-asphalt/70">ระดับความเร่งด่วน:</span>
                                    <Tag
                                        style={{ margin: 0 }}
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
                                        {record.damageType}
                                    </Tag>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-asphalt/70">ความมั่นใจ AI:</span>
                                    <div className="flex items-center gap-2 w-1/2 justify-end">
                                        <span className="font-semibold text-ink">{record.confidenceScore === null ? "-" : `${record.confidenceScore}%`}</span>
                                        <Progress
                                            percent={record.confidenceScore || 0}
                                            showInfo={false}
                                            strokeColor="#1677ff"
                                            size="small"
                                            style={{ width: 60, margin: 0 }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-2 pt-3 border-t border-line/50">
                                <Button
                                    type="primary"
                                    icon={<EyeOutlined />}
                                    className="flex-1"
                                    onClick={() => navigate(`/admin/reports/${record.id}`)}
                                >
                                    ดูรายละเอียด
                                </Button>
                                <Dropdown
                                    menu={{ items: menuItems(record) }}
                                    trigger={["click"]}
                                >
                                    <Button
                                        icon={<MoreOutlined />}
                                        loading={submitting && activeRecord?.id === record.id}
                                    />
                                </Dropdown>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal สำหรับกรอก Note ในการอัปเดตสถานะ */}
            <Modal
                title={`อัปเดตสถานะรายงาน ${activeRecord?.reportId || ""}`}
                open={modalVisible}
                onCancel={() => {
                    if (!submitting) {
                        setModalVisible(false);
                        setActionNote("");
                    }
                }}
                onOk={handleConfirmStatusChange}
                confirmLoading={submitting}
                okText="บันทึกการอัปเดต"
                cancelText="ยกเลิก"
                destroyOnClose
            >
                <Space direction="vertical" style={{ width: "100%", marginTop: 12 }} size={16}>
                    <div>
                        <Text type="secondary">ถนน: </Text>
                        <Text strong>{activeRecord?.roadName || "-"}</Text>
                    </div>

                    <div>
                        <Text type="secondary">การเปลี่ยนสถานะ: </Text>
                        <Tag color={getStatusColor(activeRecord?.priorityStatus)}>
                            {activeRecord?.priorityStatus}
                        </Tag>
                        {" → "}
                        <Tag color={getStatusColor(targetStatus)}>
                            {targetStatus}
                        </Tag>
                    </div>

                    <div>
                        <Text strong>บันทึกการปฏิบัติงาน (Note / หมายเหตุ):</Text>
                        <Input.TextArea
                            rows={4}
                            value={actionNote}
                            onChange={(e) => setActionNote(e.target.value)}
                            placeholder="ระบุว่าทำอะไรไปบ้างในการอัปเดต เช่น ส่งทีมช่างเข้าตรวจสอบ, กำลังจัดเตรียมเครื่องจักร, ซ่อมแซมเรียบร้อยแล้ว..."
                            style={{ marginTop: 8 }}
                        />
                    </div>
                </Space>
            </Modal>
        </>
    );
};

export default ReportsTable;
