import { Card, Table, Tag } from "antd";

const RecentReports = ({ reports }) => {
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
            bodyStyle={{ padding: "16px 0" }} // reduce padding for mobile lists
        >
            {/* ── Desktop View (Table) ── */}
            <div className="hidden md:block px-4">
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

            {/* ── Mobile View (Card List) ── */}
            <div className="block md:hidden px-4 space-y-4">
                {reports?.map((report) => (
                    <div 
                        key={report.id} 
                        className="p-4 border border-line rounded-xl bg-white shadow-sm flex flex-col gap-2"
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
                        
                        <div className="flex justify-between items-center mt-1 border-t border-line/50 pt-3">
                            <div className="text-xs text-asphalt">
                                {report.reporter && `แจ้งโดย: ${report.reporter}`}
                            </div>
                            <Tag>{report.status}</Tag>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default RecentReports;
