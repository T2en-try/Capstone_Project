import { useState } from "react";
import { Table, Tag, Progress, Button, Dropdown, Space, message, Modal, Input, Typography, Skeleton, Tooltip } from "antd";
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

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 5;

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

                    <Tooltip title="ดูรายละเอียด">
                        <Button
                            type="text"
                            icon={<EyeOutlined className="text-gray-500" />}
                            onClick={() => {
                                navigate(`/admin/reports/${record.id}`);
                            }}
                        />
                    </Tooltip>

                    {/* More Action */}

                    <Dropdown
                        menu={{
                            items: menuItems(record),
                        }}
                        trigger={["click"]}
                    >
                        <Button
                            type="text"
                            icon={<MoreOutlined className="text-gray-500" />}
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
            <div className="hidden md:block w-full bg-white rounded-xl shadow-sm border border-line overflow-hidden">
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={tableData}
                    loading={loading}
                    className="modern-dashboard-table"
                    scroll={{
                        x: 1200,
                    }}
                    pagination={{
                        pageSize: 5,
                        showSizeChanger: false,
                        showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total}`,
                        position: ["bottomRight"],
                    }}
                />
            </div>

            {/* ── Mobile View (Compact List) ── */}
            <div className="block md:hidden">
                <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden">
                    {loading ? (
                        <div className="p-4 space-y-4">
                            <Skeleton active paragraph={{ rows: 1 }} />
                            <Skeleton active paragraph={{ rows: 1 }} />
                        </div>
                    ) : tableData.length === 0 ? (
                        <div className="text-center text-asphalt/50 py-8">ไม่มีข้อมูล</div>
                    ) : (
                        <div>
                            {tableData
                                .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                                .map((record) => (
                                    <div key={record.id} className="border-b border-line p-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-ink text-sm">#{record.reportId}</span>
                                                <Tag color={getStatusColor(record.priorityStatus)} style={{ margin: 0, fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>
                                                    {record.priorityStatus}
                                                </Tag>
                                            </div>
                                            <p className="text-sm font-semibold text-ink truncate">{record.roadName}</p>
                                            <div className="flex items-center gap-2 text-xs text-asphalt/60 mt-1">
                                                <span>{record.damageType}</span>
                                                <span className="text-gray-300">•</span>
                                                <span>AI Conf: {record.confidenceScore || 0}%</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button
                                                type="text"
                                                icon={<EyeOutlined className="text-gray-500" />}
                                                onClick={() => navigate(`/admin/reports/${record.id}`)}
                                                className="w-8 h-8 flex items-center justify-center p-0"
                                            />
                                            <Dropdown menu={{ items: menuItems(record) }} trigger={["click"]}>
                                                <Button
                                                    type="text"
                                                    icon={<MoreOutlined className="text-gray-500" />}
                                                    loading={submitting && activeRecord?.id === record.id}
                                                    className="w-8 h-8 flex items-center justify-center p-0"
                                                />
                                            </Dropdown>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
                
                {/* Mobile Pagination */}
                {tableData.length > PAGE_SIZE && (
                    <div className="flex items-center justify-center gap-4 mt-4">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="w-8 h-8 rounded-lg border border-line text-sm text-ink disabled:opacity-30 disabled:cursor-not-allowed bg-white flex items-center justify-center"
                        >
                            &lt;
                        </button>
                        <span className="text-sm text-asphalt/70 font-medium">
                            {currentPage} / {Math.ceil(tableData.length / PAGE_SIZE) || 1}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(Math.ceil(tableData.length / PAGE_SIZE) || 1, p + 1))}
                            disabled={currentPage >= (Math.ceil(tableData.length / PAGE_SIZE) || 1)}
                            className="w-8 h-8 rounded-lg border border-line text-sm text-ink disabled:opacity-30 disabled:cursor-not-allowed bg-white flex items-center justify-center"
                        >
                            &gt;
                        </button>
                    </div>
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
