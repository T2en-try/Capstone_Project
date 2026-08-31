import {
    FileText,
    Clock3,
    Wrench,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
} from "lucide-react";

export default function StatusCard({ stats = {}, loading = false }) {
    const defaultStats = {
        total_reports: 0,
        pending_count: 0,
        processing_count: 0,
        completed_count: 0,
        rejected_count: 0,
    };

    const data = {
        ...defaultStats,
        ...stats,
    };

    const dashboardStats = [
        {
            title: "รอดำเนินการ",
            value: data.pending_count,
            description: "รายการที่รอการตรวจสอบ",
            bgColor: "bg-red-50",
            iconBg: "bg-red-100",
            textColor: "text-red-600",
            icon: Clock3,
        },
        {
            title: "กำลังดำเนินการ",
            value: data.processing_count,
            description: "อยู่ระหว่างการซ่อมแซม",
            bgColor: "bg-amber-50",
            iconBg: "bg-amber-100",
            textColor: "text-amber-600",
            icon: Wrench,
        },
        {
            title: "ซ่อมเสร็จแล้ว",
            value: data.completed_count,
            description: "ดำเนินการเสร็จสิ้น",
            bgColor: "bg-emerald-50",
            iconBg: "bg-emerald-100",
            textColor: "text-emerald-600",
            icon: CheckCircle2,
        },
        {
            title: "ปฏิเสธ",
            value: data.rejected_count,
            description: "รายการที่ไม่ผ่านการตรวจสอบ",
            bgColor: "bg-slate-50",
            iconBg: "bg-slate-200",
            textColor: "text-slate-600",
            icon: AlertCircle,
        },
    ];

    const total = data.total_reports;

    /* =========================
     Loading
  ========================= */

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3, 4].map((item) => (
                    <div
                        key={item}
                        className="h-[88px] rounded-2xl bg-slate-100 animate-pulse"
                    />
                ))}

                <div className="h-[72px] rounded-2xl bg-slate-100 animate-pulse" />
            </div>
        );
    }

    /* =========================
     UI
  ========================= */

    return (
        <div className="space-y-3">
            {/* Header */}

            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-base font-bold text-ink">
                        สถานะรายงาน
                    </h2>

                    <p className="text-xs text-asphalt/50 mt-1">
                        สรุปสถานะการดำเนินงานทั้งหมด
                    </p>
                </div>
            </div>

            {/* Status Items */}

            <div className="space-y-3">
                {dashboardStats.map((item) => {
                    const Icon = item.icon;

                    return (
                        <div
                            key={item.title}
                            className={`
                group
                ${item.bgColor}
                rounded-2xl
                border
                border-line
                p-4
                transition-all
                duration-200
                hover:-translate-y-[1px]
                hover:shadow-md
              `}
                        >
                            <div className="flex items-center justify-between">
                                {/* Left */}

                                <div className="flex items-center gap-3">
                                    {/* Icon */}

                                    <div
                                        className={`
                      ${item.iconBg}
                      ${item.textColor}
                      flex
                      h-11
                      w-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                    `}
                                    >
                                        <Icon size={21} />
                                    </div>

                                    {/* Text */}

                                    <div>
                                        <h3
                                            className={`
                        text-sm
                        font-semibold
                        ${item.textColor}
                      `}
                                        >
                                            {item.title}
                                        </h3>

                                        <p className="mt-0.5 text-xs text-asphalt/55">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Right */}

                                <div className="flex items-center gap-3">
                                    <span
                                        className={`
                      text-2xl
                      font-bold
                      ${item.textColor}
                    `}
                                    >
                                        {item.value}
                                    </span>

                                    <ChevronRight
                                        size={18}
                                        className="
                      text-asphalt/25
                      transition-transform
                      group-hover:translate-x-1
                    "
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Total */}

            <div
                className="
          mt-5
          flex
          items-center
          justify-between
          rounded-2xl
          border
          border-mark/20
          bg-mark/5
          px-5
          py-4
        "
            >
                <div className="flex items-center gap-3">
                    <div
                        className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              bg-mark/10
            "
                    >
                        <FileText size={20} className="text-mark" />
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-ink">
                            รายงานทั้งหมด
                        </p>

                        <p className="text-xs text-asphalt/50">
                            จำนวนรายการในระบบ
                        </p>
                    </div>
                </div>

                <span
                    className="
            text-2xl
            font-bold
            text-mark-deep
          "
                >
                    {total}
                </span>
            </div>
        </div>
    );
}
