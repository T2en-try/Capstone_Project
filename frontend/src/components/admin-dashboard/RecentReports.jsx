import { Card, Table, Tag } from "antd";
import { useState } from "react";

const MOBILE_PAGE_SIZE = 5;

const RecentReports = ({ reports }) => {
    // ข้อ 3: Pagination for mobile card view
    const [mobilePage, setMobilePage] = useState(1);
    const totalMobilePages = Math.ceil((reports?.length || 0) / MOBILE_PAGE_SIZE);
    const mobileReports = reports?.slice(
        (mobilePage - 1) * MOBILE_PAGE_SIZE,
        mobilePage * MOBILE_PAGE_SIZE
    ) || [];

    const columns = [
        {
            title: "Report ID",
            dataIndex: "id",
            key: "id",
        },

        {
            title: "Description",
            dataIndex: "description",
            key: "description",
        },

        {
            title: "Location",
            dataIndex: "location",
            key: "location",
        },

        {
            title: "Severity",
            dataIndex: "severity",
            key: "severity",

            render: (severity) => (
                <Tag
                    color={
                        severity === "Critical"
                            ? "red"
                            : severity === "High"
                            ? "orange"
                            : severity === "Medium"
                            ? "gold"
                            : "green"
                    }
                >
                    {severity}
                </Tag>
            ),
        },

        {
            title: "AI Confidence",
            dataIndex: "confidence",
            key: "confidence",
            render: (value) => value == null ? "-" : `${value}%`,
        },

        {
            title: "Status",
            dataIndex: "status",
            key: "status",

            render: (status) => <Tag>{status}</Tag>,
        },

        {
            title: "Rejection Reason",
            dataIndex: "rejectionReason",
            key: "rejectionReason",
            render: (value) => value || "-",
        },

        {
            title: "Reporter",
            dataIndex: "reporter",
            key: "reporter",
        },

        {
            title: "Created",
            dataIndex: "createdAt",
            key: "createdAt",
        },
    ];

    return (
        <Card
            title="รายการแจ้งล่าสุด"
            style={{
                borderRadius: 12,
            }}
            styles={{ body: { padding: "16px 0" } }}
        >
            {/* ── Desktop View (Table) ── */}
            <div className="hidden md:block px-4">
                {/* ข้อ 17: Swipe hint for table */}
                <div className="table-swipe-hint">
                    <span>← ปัดซ้าย-ขวาเพื่อดูข้อมูลเพิ่ม →</span>
                </div>
                <Table
                columns={columns}
                dataSource={reports}
                rowKey="id"
                pagination={{
                    pageSize: 5,
                }}
                scroll={{
                    x: 900,
                }}
            />
            </div>

            {/* ── Mobile View (Card List) with Pagination ── */}
            <div className="block md:hidden px-4 space-y-3">
                {mobileReports.map((report) => (
                    <div 
                        key={report.id} 
                        className="p-3 border border-line rounded-xl bg-white shadow-sm flex flex-col gap-2"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-ink text-sm">#{report.id}</h3>
                                <p className="text-xs text-asphalt/70 mt-0.5">{report.createdAt}</p>
                            </div>
                            <Tag
                                color={
                                    report.severity === "Critical"
                                        ? "red"
                                        : report.severity === "High"
                                        ? "orange"
                                        : report.severity === "Medium"
                                        ? "gold"
                                        : "green"
                                }
                            >
                                {report.severity}
                            </Tag>
                        </div>
                        
                        <div className="text-sm text-ink-soft">
                            <span className="font-semibold">รายละเอียด:</span> {report.description}
                        </div>
                        <div className="text-sm text-ink-soft line-clamp-1">
                            <span className="font-semibold">พิกัด:</span> {report.location}
                        </div>
                        
                        <div className="flex justify-between items-center mt-1 border-t border-line/50 pt-2">
                            <div className="text-xs text-asphalt">
                                {report.reporter && `แจ้งโดย: ${report.reporter}`}
                            </div>
                            <Tag>{report.status}</Tag>
                        </div>
                    </div>
                ))}

                {/* ข้อ 3: Mobile Pagination Controls */}
                {totalMobilePages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setMobilePage((p) => Math.max(1, p - 1))}
                            disabled={mobilePage === 1}
                            className="px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white disabled:opacity-40 active:scale-95 transition-all"
                        >
                            ← ก่อนหน้า
                        </button>
                        <span className="text-xs text-gray-500 tabular-nums">
                            {mobilePage} / {totalMobilePages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setMobilePage((p) => Math.min(totalMobilePages, p + 1))}
                            disabled={mobilePage === totalMobilePages}
                            className="px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white disabled:opacity-40 active:scale-95 transition-all"
                        >
                            ถัดไป →
                        </button>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default RecentReports;
