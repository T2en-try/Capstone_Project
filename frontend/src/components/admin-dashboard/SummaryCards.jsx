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
            className="grid grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3.5 w-full"
        >
            {cards.map((card, index) => (
                <article
                    key={card.title}
                    className={`${index === 0 ? "col-span-2 sm:col-span-1" : "col-span-1"} bg-white border border-[#D9E3DF] rounded-xl p-2.5 sm:p-4 min-h-[85px] sm:min-h-[118px] transition-colors`}
                >
                    {/* Top */}
                    <header className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                        {/* Icon */}
                        <span
                            className="flex shrink-0 items-center justify-center rounded-lg w-8 h-8 sm:w-[38px] sm:h-[38px] text-base sm:text-lg"
                            style={{
                                background: card.bg,
                                color: card.color,
                            }}
                        >
                            {card.icon}
                        </span>

                        {/* Status */}
                        <span
                            className="inline-flex items-center rounded-md px-1.5 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap text-[10px] sm:text-[11px] font-semibold leading-tight"
                            style={{
                                background: card.bg,
                                color: card.color,
                                fontFamily: "Sarabun, sans-serif",
                            }}
                        >
                            {card.status}
                        </span>
                    </header>

                    {/* Content */}
                    <p
                        className="text-[#64756F] text-[11px] sm:text-[13px] leading-snug m-0"
                        style={{ fontFamily: "Sarabun, sans-serif" }}
                    >
                        {card.title}
                    </p>

                    <p
                        className="text-[#14352F] text-xl sm:text-[28px] font-semibold leading-none mt-1 sm:mt-1.5"
                        style={{ fontFamily: "Kanit, Sarabun, sans-serif" }}
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