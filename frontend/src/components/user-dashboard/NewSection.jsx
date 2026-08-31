import React, { useEffect, useState } from "react";
import {
    MapPin,
    Clock3,
    AlertTriangle,
    CheckCircle2,
    Wrench,
    XCircle,
    ImageOff,
} from "lucide-react";

import {
    fetchLatestReports,
    getReportImageUrl,
} from "../../services/dashboardService";

const NewsSection = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // =========================================================
    // Load Latest Reports
    // =========================================================

    useEffect(() => {
        const loadLatestReports = async () => {
            try {
                setLoading(true);
                setError(null);

                const result = await fetchLatestReports(4);

                if (result.success) {
                    setReports(result.data.reports || []);
                } else {
                    setError(result.error || "ไม่สามารถโหลดข่าวแจ้งปัญหาได้");
                }
            } catch (err) {
                console.error("❌ NewsSection:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadLatestReports();
    }, []);

    // =========================================================
    // Status
    // =========================================================

    const getStatus = (status) => {
        const statusMap = {
            pending: {
                label: "รอดำเนินการ",
                color: "bg-red-500",
                soft: "bg-red-50",
                text: "text-red-600",
                border: "border-red-100",
                Icon: AlertTriangle,
            },

            processing: {
                label: "กำลังดำเนินการ",
                color: "bg-orange-500",
                soft: "bg-orange-50",
                text: "text-orange-600",
                border: "border-orange-100",
                Icon: Wrench,
            },

            completed: {
                label: "ซ่อมเสร็จแล้ว",
                color: "bg-emerald-500",
                soft: "bg-emerald-50",
                text: "text-emerald-600",
                border: "border-emerald-100",
                Icon: CheckCircle2,
            },

            rejected: {
                label: "ปฏิเสธ",
                color: "bg-slate-400",
                soft: "bg-slate-50",
                text: "text-slate-500",
                border: "border-slate-200",
                Icon: XCircle,
            },
        };

        return (
            statusMap[status] || {
                label: "ไม่ระบุสถานะ",
                color: "bg-slate-400",
                soft: "bg-slate-50",
                text: "text-slate-500",
                border: "border-slate-200",
                Icon: AlertTriangle,
            }
        );
    };

    // =========================================================
    // Title
    // =========================================================

    const getTitle = (report) => {
        return report.reporter_name || `รายงานปัญหาถนน #${report.id}`;
    };

    // =========================================================
    // Road Name
    // =========================================================

    const getRoadName = (report) => {
        return report.road_name || report.roadName || "ไม่ระบุชื่อถนน";
    };

    // =========================================================
    // Date
    // =========================================================

    const formatDate = (date) => {
        if (!date) {
            return "ไม่ระบุวันที่";
        }

        try {
            const parsedDate = new Date(date);

            if (Number.isNaN(parsedDate.getTime())) {
                return date;
            }

            return parsedDate.toLocaleString("th-TH", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return date;
        }
    };

    // =========================================================
    // Loading UI
    // =========================================================

    if (loading) {
        return (
            <section className="w-full">
                {/* Header */}

                <div className="mb-6">
                    <div className="h-7 w-64 rounded-lg bg-slate-200 animate-pulse" />

                    <div className="mt-2 h-4 w-96 max-w-full rounded bg-slate-100 animate-pulse" />
                </div>

                {/* Cards */}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                    {[1, 2, 3, 4].map((item) => (
                        <div
                            key={item}
                            className="
                                overflow-hidden
                                rounded-2xl
                                border
                                border-slate-200
                                bg-white
                                shadow-sm
                            "
                        >
                            <div className="h-48 bg-slate-100 animate-pulse" />

                            <div className="p-5 space-y-3">
                                <div className="h-5 w-3/4 bg-slate-100 rounded animate-pulse" />

                                <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />

                                <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse" />

                                <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    // =========================================================
    // Error UI
    // =========================================================

    if (error) {
        return (
            <section className="w-full">
                <div
                    className="
                        flex
                        items-center
                        gap-3
                        rounded-2xl
                        border
                        border-red-200
                        bg-red-50
                        px-5
                        py-4
                        text-red-600
                    "
                >
                    <AlertTriangle size={20} className="shrink-0" />

                    <div>
                        <p className="font-semibold">
                            ไม่สามารถโหลดข่าวแจ้งปัญหาได้
                        </p>

                        <p className="text-sm mt-0.5 text-red-500">{error}</p>
                    </div>
                </div>
            </section>
        );
    }

    // =========================================================
    // UI
    // =========================================================

    return (
        <section className="w-full">
            {/* =================================================
                Header
            ================================================= */}

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <div
                            className="
                                flex
                                h-9
                                w-9
                                items-center
                                justify-center
                                rounded-xl
                                bg-mark/10
                            "
                        >
                            <AlertTriangle size={19} className="text-mark" />
                        </div>

                        <h2 className="text-xl font-bold text-slate-800">
                            ข่าวแจ้งปัญหาถนนล่าสุด
                        </h2>
                    </div>

                    <p className="text-sm text-slate-500 mt-2 ml-11">
                        สรุปเหตุการณ์ถนนชำรุดและรายงานพื้นที่ใกล้เคียง
                    </p>
                </div>
            </div>

            {/* =================================================
                Empty
            ================================================= */}

            {reports.length === 0 && (
                <div
                    className="
                        rounded-2xl
                        border
                        border-dashed
                        border-slate-300
                        bg-white
                        px-6
                        py-14
                        text-center
                    "
                >
                    <div
                        className="
                            mx-auto
                            flex
                            h-14
                            w-14
                            items-center
                            justify-center
                            rounded-2xl
                            bg-slate-100
                        "
                    >
                        <AlertTriangle size={25} className="text-slate-400" />
                    </div>

                    <p className="mt-4 text-sm font-semibold text-slate-600">
                        ยังไม่มีรายงานปัญหาถนน
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                        เมื่อมีการแจ้งปัญหา รายงานจะแสดงที่นี่
                    </p>
                </div>
            )}

            {/* =================================================
                Report Cards
            ================================================= */}

            {reports.length > 0 && (
                <div
                    className="
                        grid
                        grid-cols-1
                        md:grid-cols-2
                        xl:grid-cols-4
                        gap-5
                    "
                >
                    {reports.map((report) => {
                        const status = getStatus(report.status);
                        const imageUrl = getReportImageUrl(report);

                        return (
                            <article
                                key={report.id}
                                className="
                                    relative
                                    flex
                                    flex-col
                                    overflow-hidden
                                    rounded-2xl
                                    border
                                    border-slate-200
                                    bg-white
                                    shadow-sm
                                "
                            >
                                {/* =================================================
                                    Image
                                ================================================= */}

                                <div
                                    className="
                                        relative
                                        h-48
                                        w-full
                                        overflow-hidden
                                        bg-slate-100
                                    "
                                >
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={getTitle(report)}
                                            className="
                                                h-full
                                                w-full
                                                object-cover
                                            "
                                            onError={(event) => {
                                                event.currentTarget.style.display =
                                                    "none";

                                                const fallback = event.currentTarget.parentElement?.querySelector(
                                                    ".image-fallback"
                                                );

                                                if (fallback) {
                                                    fallback.classList.remove(
                                                        "hidden"
                                                    );
                                                }
                                            }}
                                        />
                                    ) : null}

                                    {/* Image fallback */}

                                    <div
                                        className={`
                                            image-fallback
                                            absolute
                                            inset-0
                                            flex
                                            flex-col
                                            items-center
                                            justify-center
                                            bg-gradient-to-br
                                            from-slate-100
                                            to-slate-200
                                            text-slate-400
                                            ${imageUrl ? "hidden" : ""}
                                        `}
                                    >
                                        <div
                                            className="
                                                flex
                                                h-14
                                                w-14
                                                items-center
                                                justify-center
                                                rounded-2xl
                                                bg-white
                                                shadow-sm
                                            "
                                        >
                                            <ImageOff size={25} />
                                        </div>

                                        <span className="mt-2 text-xs font-medium">
                                            ไม่มีรูปภาพ
                                        </span>
                                    </div>

                                    {/* Gradient */}

                                    <div
                                        className="
                                            absolute
                                            inset-x-0
                                            bottom-0
                                            h-24
                                            bg-gradient-to-t
                                            from-black/45
                                            to-transparent
                                            pointer-events-none
                                        "
                                    />

                                    {/* Status */}

                                    <div
                                        className="
                                            absolute
                                            top-3
                                            right-3
                                            flex
                                            items-center
                                            gap-1.5
                                            rounded-full
                                            bg-white/95
                                            px-2.5
                                            py-1.5
                                            shadow-md
                                            backdrop-blur
                                        "
                                    >
                                        <span
                                            className={`
                                                h-2
                                                w-2
                                                rounded-full
                                                ${status.color}
                                            `}
                                        />

                                        <span
                                            className="
                                                text-[10px]
                                                font-bold
                                                text-slate-700
                                            "
                                        >
                                            {status.label}
                                        </span>
                                    </div>
                                </div>

                                {/* =================================================
                                    Content
                                ================================================= */}

                                <div className="flex flex-1 flex-col p-5">
                                    {/* Title */}

                                    <h3
                                        className="
                                            line-clamp-2
                                            text-base
                                            font-bold
                                            leading-snug
                                            text-slate-800
                                        "
                                    >
                                        {getTitle(report)}
                                    </h3>

                                    {/* Description */}

                                    <p
                                        className="
                                            mt-2
                                            line-clamp-3
                                            text-sm
                                            leading-relaxed
                                            text-slate-500
                                        "
                                    >
                                        {report.description ||
                                            "ไม่มีรายละเอียดรายงาน"}
                                    </p>

                                    {/* =================================================
                                        Road Info
                                    ================================================= */}

                                    <div
                                        className="
                                            mt-4
                                            rounded-xl
                                            border
                                            border-slate-100
                                            bg-slate-50
                                            p-3
                                        "
                                    >
                                        <div
                                            className="
                                                flex
                                                items-center
                                                gap-2
                                            "
                                        >
                                            <div
                                                className="
                                                    flex
                                                    h-8
                                                    w-8
                                                    shrink-0
                                                    items-center
                                                    justify-center
                                                    rounded-lg
                                                    bg-white
                                                    shadow-sm
                                                "
                                            >
                                                <MapPin
                                                    size={15}
                                                    className="text-blue-500"
                                                />
                                            </div>

                                            <div className="min-w-0">
                                                <p className="text-[10px] text-slate-400">
                                                    พื้นที่รายงาน
                                                </p>

                                                <p
                                                    className="
                                                        truncate
                                                        text-xs
                                                        font-semibold
                                                        text-slate-700
                                                    "
                                                >
                                                    {getRoadName(report)}
                                                </p>
                                            </div>
                                        </div>

                                        <div
                                            className="
                                                mt-2
                                                flex
                                                items-center
                                                gap-2
                                                border-t
                                                border-slate-200/70
                                                pt-2
                                            "
                                        >
                                            <Clock3
                                                size={13}
                                                className="text-slate-400"
                                            />

                                            <span className="text-[10px] text-slate-400">
                                                รายงานเมื่อ
                                            </span>

                                            <span className="ml-auto text-[10px] font-medium text-slate-500">
                                                {formatDate(report.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default NewsSection;
