import {
    FileSearchOutlined,
    ClockCircleOutlined,
    SyncOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
} from "@ant-design/icons";

const SummaryCards = ({ data }) => {
    const cards = [
        {
            title: "รายงานทั้งหมด",
            value: data.totalReports ?? 0,
            icon: <FileSearchOutlined />,
            color: "#14352F",
            bg: "#E8EFEC",
            status: "ทั้งหมด",
        },
        {
            title: "รอตรวจสอบ",
            value: data.pendingReports ?? 0,
            icon: <ClockCircleOutlined />,
            color: "#C4891A",
            bg: "#FFF5D9",
            status: "รอตรวจสอบ",
        },
        {
            title: "กำลังดำเนินการ",
            value: data.processingReports ?? 0,
            icon: <SyncOutlined />,
            color: "#2F6F7E",
            bg: "#E8F1F3",
            status: "ดำเนินการ",
        },
        {
            title: "ซ่อมเสร็จแล้ว",
            value: data.completedReports ?? 0,
            icon: <CheckCircleOutlined />,
            color: "#2D7A5F",
            bg: "#E8F3EE",
            status: "เสร็จแล้ว",
        },
        {
            title: "ปฏิเสธ",
            value: data.rejectedReports ?? 0,
            icon: <CloseCircleOutlined />,
            color: "#C45C4A",
            bg: "#F9EDEA",
            status: "ปฏิเสธ",
        },
    ];

    return (
        <section
            aria-label="สรุปสถานะรายงาน"
            className="flex sm:grid sm:grid-cols-3 md:grid-cols-5 gap-3.5 overflow-x-auto snap-x snap-mandatory pb-2 w-full hide-scrollbar"
        >
            {cards.map((card) => (
                <article
                    key={card.title}
                    className="min-w-[80%] sm:min-w-0 shrink-0 snap-center"
                    style={{
                        background: "#FFFFFF",
                        border: "1px solid #D9E3DF",
                        borderRadius: 12,
                        padding: "15px 16px",
                        minHeight: 118,
                        boxSizing: "border-box",
                        transition: "border-color 0.2s ease",
                    }}
                >
                    {/* Top */}
                    <header
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            marginBottom: 12,
                        }}
                    >
                        {/* Icon */}
                        <span
                            style={{
                                width: 38,
                                height: 38,
                                flexShrink: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 9,
                                background: card.bg,
                                color: card.color,
                                fontSize: 18,
                            }}
                        >
                            {card.icon}
                        </span>

                        {/* Status */}
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "4px 8px",
                                borderRadius: 6,
                                background: card.bg,
                                color: card.color,
                                fontFamily: "Sarabun, sans-serif",
                                fontSize: 11,
                                fontWeight: 600,
                                lineHeight: 1.2,
                                whiteSpace: "nowrap",
                            }}
                        >
                            {card.status}
                        </span>
                    </header>

                    {/* Content */}
                    <p
                        style={{
                            margin: 0,
                            color: "#64756F",
                            fontFamily: "Sarabun, sans-serif",
                            fontSize: 13,
                            lineHeight: 1.4,
                        }}
                    >
                        {card.title}
                    </p>

                    <p
                        style={{
                            margin: "3px 0 0",
                            color: "#14352F",
                            fontFamily:
                                "Kanit, Sarabun, sans-serif",
                            fontSize: 28,
                            fontWeight: 600,
                            lineHeight: 1.15,
                            letterSpacing: "-0.5px",
                        }}
                    >
                        {card.value.toLocaleString()}
                    </p>
                </article>
            ))}
            <style>{`
              .hide-scrollbar::-webkit-scrollbar {
                display: none;
              }
              .hide-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
        </section>
    );
};

export default SummaryCards;