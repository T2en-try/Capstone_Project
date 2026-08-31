import {
    MapPin,
    Clock3,
    ChevronRight,
    SearchX,
} from "lucide-react";

const STATUS_LABELS = {
    pending: "รอดำเนินการ",
    processing: "กำลังดำเนินการ",
    completed: "ซ่อมเสร็จแล้ว",
    rejected: "ปฏิเสธ",
};

const getRoadName = (report) =>
    report?.ai_analysis?.road_name ||
    report?.road_name ||
    "ไม่ระบุชื่อถนน";

const formatDate = (value) => {
    if (!value) {
        return "-";
    }

    try {
        return new Date(value).toLocaleString("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return value;
    }
};

export default function SearchResults({
    reports = [],
    active = false,
    onSelect,
}) {
    if (!active) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-asphalt">
                        ผลการค้นหา
                    </h3>
                    <p className="text-xs text-asphalt/50">
                        {reports.length > 0
                            ? `พบ ${reports.length} รายการ`
                            : "ไม่พบรายงานที่ตรงกับเงื่อนไข"}
                    </p>
                </div>
            </div>

            {reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-10 text-center">
                    <SearchX size={28} className="text-asphalt/30" />
                    <p className="mt-3 text-sm font-medium text-asphalt/60">
                        ไม่พบรายงานที่ตรงกับคำค้นหา
                    </p>
                    <p className="mt-1 text-xs text-asphalt/45">
                        ลองเปลี่ยนคำค้นหรือเลือกสถานะอื่น
                    </p>
                </div>
            ) : (
                <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                    {reports.map((report) => {
                        const statusLabel =
                            STATUS_LABELS[report.status] ||
                            report.status ||
                            "ไม่ระบุ";

                        return (
                            <button
                                key={report.id}
                                type="button"
                                onClick={() => onSelect?.(report.id)}
                                className="flex w-full items-start gap-3 rounded-xl border border-line bg-white p-3 text-left transition hover:border-mark/40 hover:bg-mark/5"
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mark/10 text-sm font-bold text-mark-deep">
                                    #{report.id}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-semibold text-asphalt">
                                            {getRoadName(report)}
                                        </p>
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-asphalt/70">
                                            {statusLabel}
                                        </span>
                                    </div>

                                    <p className="mt-1 line-clamp-2 text-xs text-asphalt/55">
                                        {report.description || "ไม่มีรายละเอียด"}
                                    </p>

                                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-asphalt/45">
                                        {report.reporter_name && (
                                            <span>{report.reporter_name}</span>
                                        )}
                                        <span className="inline-flex items-center gap-1">
                                            <Clock3 size={11} />
                                            {formatDate(report.created_at)}
                                        </span>
                                        {(report.latitude != null &&
                                            report.longitude != null) && (
                                            <span className="inline-flex items-center gap-1">
                                                <MapPin size={11} />
                                                มีพิกัดบนแผนที่
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <ChevronRight
                                    size={16}
                                    className="mt-1 shrink-0 text-asphalt/30"
                                />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
