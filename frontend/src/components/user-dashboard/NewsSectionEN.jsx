import React, { useEffect, useRef, useState } from "react";
import {
    MapPin,
    Clock3,
    AlertTriangle,
    CheckCircle2,
    Wrench,
    XCircle,
    ImageOff,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

import {
    fetchLatestReports,
    getReportImageUrl,
} from "../../services/dashboardService";

import { getReportStatus } from "../../utils/statusHelper";

const NewsSection = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reportsContainerRef = useRef(null);

    // =========================================================
    // Load Latest Reports
    // =========================================================

    useEffect(() => {
        const loadLatestReports = async () => {
            try {
                setLoading(true);
                setError(null);

                // Load more than 4 reports for horizontal scrolling
                const result = await fetchLatestReports(20);

                if (result.success) {
                    setReports(result.data.reports || []);
                } else {
                    setError(
                        result.error ||
                            "Unable to load the latest road reports."
                    );
                }
            } catch (err) {
                console.error("❌ NewsSection:", err);

                setError(
                    err?.message ||
                        "Unable to load the latest road reports."
                );
            } finally {
                setLoading(false);
            }
        };

        loadLatestReports();
    }, []);

    // =========================================================
    // Horizontal Scroll
    // =========================================================

    const scrollReports = (direction) => {
        const container = reportsContainerRef.current;

        if (!container) return;

        container.scrollBy({
            left: direction === "left" ? -380 : 380,
            behavior: "smooth",
        });
    };

    const handleReportsWheel = (event) => {
        const container = reportsContainerRef.current;

        if (!container) return;

        // Convert vertical mouse wheel movement to horizontal scrolling
        if (
            Math.abs(event.deltaY) >
            Math.abs(event.deltaX)
        ) {
            event.preventDefault();

            container.scrollLeft += event.deltaY;
        }
    };

    // =========================================================
    // Status
    // =========================================================

    const getStatus = (status) => {
        const statusMap = {
            pending: {
                label: "Pending",
                color: "bg-red-500",
                Icon: AlertTriangle,
            },

            processing: {
                label: "In Progress",
                color: "bg-orange-500",
                Icon: Wrench,
            },

            completed: {
                label: "Completed",
                color: "bg-emerald-500",
                Icon: CheckCircle2,
            },

            rejected: {
                label: "Rejected",
                color: "bg-slate-400",
                Icon: XCircle,
            },
        };

        return (
            statusMap[status] || {
                label: "Unknown Status",
                color: "bg-slate-400",
                Icon: AlertTriangle,
            }
        );
    };

    // =========================================================
    // Title
    // =========================================================

    const getTitle = (report) => {
        return (
            report?.reporter_name ||
            `Road Report #${report?.id || "-"}`
        );
    };

    // =========================================================
    // GIS CONTEXT
    // =========================================================

    const getGISInfo = (report) => {
        const analysis = report?.ai_analysis || {};

        const aiGIS =
            report?.ai_gis_context ||
            analysis?.ai_gis_context ||
            report?.ai_gis_context_data ||
            {};

        const gisContext =
            report?.gis_context ||
            analysis?.gis_context ||
            {};

        const resultGIS =
            report?.ai_result?.context_data?.gis ||
            report?.ai_result?.gis ||
            {};

        const contextGIS =
            report?.context_data?.gis ||
            {};

        const gis = {
            ...contextGIS,
            ...resultGIS,
            ...gisContext,
            ...aiGIS,
            ...analysis,
        };

        return {
            roadName:
                gis.road_name ||
                gis.roadName ||
                "",

            roadType:
                gis.road_type ||
                gis.roadType ||
                gis.osm_highway_type ||
                gis.highway ||
                "",

            subdistrict:
                gis.admin_subdistrict ||
                gis.subdistrict ||
                gis.adminSubdistrict ||
                "",

            district:
                gis.admin_district ||
                gis.district ||
                gis.adminDistrict ||
                "",

            province:
                gis.admin_province ||
                gis.province ||
                gis.adminProvince ||
                "",

            osmWayId:
                gis.osm_way_id ||
                gis.osmWayId ||
                null,
        };
    };

    // =========================================================
    // Format Area
    // =========================================================

    const formatArea = (report) => {
        const gis = getGISInfo(report);

        const parts = [];

        if (gis.subdistrict) {
            parts.push(gis.subdistrict);
        }

        if (gis.district) {
            parts.push(gis.district);
        }

        if (gis.province) {
            parts.push(gis.province);
        }

        if (parts.length === 0) {
            return "Location not specified";
        }

        return parts.join(", ");
    };

    // =========================================================
    // Road Type
    // =========================================================

    const getRoadType = (report) => {
        const gis = getGISInfo(report);

        return gis.roadType || "Not specified";
    };

    // =========================================================
    // Date
    // =========================================================

    const formatDate = (date) => {
        if (!date) {
            return "Date not specified";
        }

        try {
            const parsedDate = new Date(date);

            if (Number.isNaN(parsedDate.getTime())) {
                return date;
            }

            return parsedDate.toLocaleString("en-US", {
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
    // Loading
    // =========================================================

    if (loading) {
        return (
            <section className="w-full">
                <div className="mb-6">
                    <div className="h-7 w-64 rounded-lg bg-slate-200 animate-pulse" />

                    <div className="mt-2 h-4 w-96 max-w-full rounded bg-slate-100 animate-pulse" />
                </div>

                <div className="flex gap-5 overflow-hidden">
                    {[1, 2, 3, 4].map((item) => (
                        <div
                            key={item}
                            className="
                                w-[320px]
                                min-w-[320px]
                                shrink-0
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
                                <div className="h-5 w-3/4 rounded bg-slate-100 animate-pulse" />

                                <div className="h-4 w-full rounded bg-slate-100 animate-pulse" />

                                <div className="h-4 w-5/6 rounded bg-slate-100 animate-pulse" />

                                <div className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    // =========================================================
    // Error
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
                    <AlertTriangle
                        size={20}
                        className="shrink-0"
                    />

                    <div>
                        <p className="font-semibold">
                            Unable to load the latest road reports
                        </p>

                        <p className="mt-0.5 text-sm text-red-500">
                            {error}
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    // =========================================================
    // Main UI
    // =========================================================

    return (
        <section className="w-full">

            {/* =================================================
                Header
            ================================================= */}

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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
                                bg-blue-50
                            "
                        >
                            <AlertTriangle
                                size={19}
                                className="text-blue-600"
                            />
                        </div>

                        <h2 className="text-xl font-bold text-slate-800">
                            Latest Road Reports
                        </h2>
                    </div>

                    <p className="mt-2 ml-11 text-sm text-slate-500">
                        Recent road damage reports and nearby reported areas
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
                        <AlertTriangle
                            size={25}
                            className="text-slate-400"
                        />
                    </div>

                    <p className="mt-4 text-sm font-semibold text-slate-600">
                        No road reports yet
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                        New road reports will appear here
                    </p>
                </div>
            )}

            {/* =================================================
                Reports
            ================================================= */}

            {reports.length > 0 && (
                <div className="relative w-full min-w-0">

                    {/* =================================================
                        Left Button
                    ================================================= */}

                    {reports.length > 4 && (
                        <button
                            type="button"
                            onClick={() =>
                                scrollReports("left")
                            }
                            aria-label="Scroll reports left"
                            className="
                                absolute
                                left-1
                                top-1/2
                                z-20
                                -translate-y-1/2

                                flex
                                h-10
                                w-10
                                items-center
                                justify-center

                                rounded-full
                                border
                                border-slate-200
                                bg-white

                                text-slate-600

                                shadow-md

                                transition

                                hover:bg-slate-50
                                hover:text-blue-600

                                active:scale-95
                            "
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}

                    {/* =================================================
                        Horizontal Scroll Container
                    ================================================= */}

                    <div
                        ref={reportsContainerRef}
                        onWheel={handleReportsWheel}
                        className="
                            news-scroll

                            flex
                            w-full
                            min-w-0

                            gap-5

                            overflow-x-auto
                            overflow-y-hidden

                            scroll-smooth

                            snap-x
                            snap-mandatory

                            px-1
                            pb-4

                            overscroll-x-contain
                        "
                    >
                        {reports.map((report) => {
                            const status = getStatus(
                                getReportStatus(report)
                            );

                            const imageUrl =
                                getReportImageUrl(report);

                            return (
                                <article
                                    key={report.id}
                                    className="
                                        relative
                                        flex
                                        flex-col

                                        w-[320px]
                                        min-w-[320px]

                                        sm:w-[320px]
                                        sm:min-w-[320px]

                                        lg:w-[330px]
                                        lg:min-w-[330px]

                                        xl:w-[340px]
                                        xl:min-w-[340px]

                                        shrink-0

                                        overflow-hidden

                                        rounded-2xl
                                        border
                                        border-slate-200

                                        bg-white

                                        shadow-sm

                                        snap-start
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
                                                alt={getTitle(
                                                    report
                                                )}
                                                className="
                                                    h-full
                                                    w-full
                                                    object-cover
                                                "
                                                onError={(
                                                    event
                                                ) => {
                                                    event.currentTarget.style.display =
                                                        "none";

                                                    const fallback =
                                                        event
                                                            .currentTarget
                                                            .parentElement
                                                            ?.querySelector(
                                                                ".image-fallback"
                                                            );

                                                    if (
                                                        fallback
                                                    ) {
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

                                                ${
                                                    imageUrl
                                                        ? "hidden"
                                                        : ""
                                                }
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
                                                <ImageOff
                                                    size={25}
                                                />
                                            </div>

                                            <span className="mt-2 text-xs font-medium">
                                                No image available
                                            </span>
                                        </div>

                                        {/* Gradient */}

                                        <div
                                            className="
                                                pointer-events-none
                                                absolute
                                                inset-x-0
                                                bottom-0
                                                h-24
                                                bg-gradient-to-t
                                                from-black/45
                                                to-transparent
                                            "
                                        />

                                        {/* Status */}

                                        <div
                                            className="
                                                absolute
                                                right-3
                                                top-3

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
                                                "No report description available"}
                                        </p>

                                        {/* =================================================
                                            GIS
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

                                            {/* Location */}

                                            <div className="flex items-start gap-2">
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

                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] text-slate-400">
                                                        Report Area
                                                    </p>

                                                    <p
                                                        className="
                                                            mt-0.5
                                                            line-clamp-2

                                                            text-xs
                                                            font-semibold
                                                            leading-relaxed
                                                            text-slate-700
                                                        "
                                                        title={formatArea(
                                                            report
                                                        )}
                                                    >
                                                        {formatArea(
                                                            report
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Road Type */}

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
                                                <span className="text-[10px] text-slate-400">
                                                    Road Type
                                                </span>

                                                <span
                                                    className="
                                                        ml-auto
                                                        max-w-[65%]
                                                        truncate

                                                        text-[10px]
                                                        font-medium
                                                        text-slate-500
                                                    "
                                                    title={getRoadType(
                                                        report
                                                    )}
                                                >
                                                    {getRoadType(
                                                        report
                                                    )}
                                                </span>
                                            </div>

                                            {/* Date */}

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
                                                    Reported
                                                </span>

                                                <span className="ml-auto text-[10px] font-medium text-slate-500">
                                                    {formatDate(
                                                        report.created_at
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    {/* =================================================
                        Right Button
                    ================================================= */}

                    {reports.length > 4 && (
                        <button
                            type="button"
                            onClick={() =>
                                scrollReports("right")
                            }
                            aria-label="Scroll reports right"
                            className="
                                absolute
                                right-1
                                top-1/2
                                z-20
                                -translate-y-1/2

                                flex
                                h-10
                                w-10
                                items-center
                                justify-center

                                rounded-full
                                border
                                border-slate-200
                                bg-white

                                text-slate-600

                                shadow-md

                                transition

                                hover:bg-slate-50
                                hover:text-blue-600

                                active:scale-95
                            "
                        >
                            <ChevronRight size={20} />
                        </button>
                    )}

                    {/* =================================================
                        Hint
                    ================================================= */}

                    {reports.length > 4 && (
                        <div className="mt-1 flex justify-center">
                            <span className="text-[10px] text-slate-400">
                                Scroll left or right to view more reports
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* =================================================
                Scrollbar Style
            ================================================= */}

            <style>{`
                .news-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: #CBD5E1 transparent;
                }

                .news-scroll::-webkit-scrollbar {
                    height: 7px;
                }

                .news-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }

                .news-scroll::-webkit-scrollbar-thumb {
                    background: #CBD5E1;
                    border-radius: 999px;
                }

                .news-scroll::-webkit-scrollbar-thumb:hover {
                    background: #94A3B8;
                }
            `}</style>
        </section>
    );
};

export default NewsSection;