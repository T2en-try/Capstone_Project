import { Search, Filter, X, Loader2 } from "lucide-react";
import { useState } from "react";

const STATUS_OPTIONS = [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "processing", label: "In Progress" },
    { value: "completed", label: "Completed" },
];

export default function SearchBar({
    onSearch,
    searching = false,
    disabled = false,
    resultMeta = null,
}) {
    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState("all");

    const emitSearch = (nextKeyword, nextStatus) => {
        if (disabled || !onSearch) {
            return;
        }

        onSearch({
            keyword: nextKeyword.trim(),
            status: nextStatus,
        });
    };

    const handleSearch = () => {
        emitSearch(keyword, status);
    };

    const handleClear = () => {
        setKeyword("");
        setStatus("all");
        emitSearch("", "all");
    };

    const handleStatusChange = (event) => {
        const nextStatus = event.target.value;

        setStatus(nextStatus);
        emitSearch(keyword, nextStatus);
    };

    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            handleSearch();
        }
    };

    const hasFilter =
        keyword.trim() !== "" || status !== "all";

    const isActive =
        resultMeta?.active ?? hasFilter;

    return (
        <div
            className="
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-4
                shadow-sm
            "
        >
            {/* =================================================
                Header
            ================================================= */}

            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div
                        className="
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-lg
                            bg-blue-50
                        "
                    >
                        <Filter
                            size={18}
                            className="text-blue-600"
                        />
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-800">
                            Search & Filter
                        </h3>

                        <p className="text-xs text-slate-400">
                            Press Enter to search quickly • Status changes apply immediately
                        </p>
                    </div>
                </div>

                {hasFilter && (
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={searching || disabled}
                        className="
                            flex
                            items-center
                            gap-1.5
                            rounded-lg
                            px-3
                            py-1.5
                            text-xs
                            font-medium
                            text-slate-500
                            transition
                            hover:bg-slate-100
                            hover:text-slate-700
                            disabled:opacity-50
                        "
                    >
                        <X size={14} />
                        Clear Filters
                    </button>
                )}
            </div>

            {/* =================================================
                Search Controls
            ================================================= */}

            <div className="flex flex-col gap-3 lg:flex-row">

                {/* Search Input */}

                <div className="relative flex-1">
                    <Search
                        size={19}
                        className="
                            absolute
                            left-4
                            top-1/2
                            -translate-y-1/2
                            text-slate-400
                        "
                    />

                    <input
                        type="text"
                        value={keyword}
                        onChange={(event) =>
                            setKeyword(event.target.value)
                        }
                        onKeyDown={handleKeyDown}
                        placeholder="Search report ID, road name, or description..."
                        aria-label="Search reports"
                        disabled={searching || disabled}
                        className="
                            h-11
                            w-full
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            pl-11
                            pr-4
                            text-sm
                            text-slate-700
                            outline-none
                            transition
                            placeholder:text-slate-400
                            hover:border-slate-300
                            focus:border-blue-500
                            focus:ring-2
                            focus:ring-blue-100
                            disabled:opacity-60
                        "
                    />
                </div>

                {/* Status Filter */}

                <div className="relative">
                    <select
                        value={status}
                        onChange={handleStatusChange}
                        aria-label="Filter by status"
                        disabled={searching || disabled}
                        className="
                            h-11
                            w-full
                            appearance-none
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            px-4
                            pr-10
                            text-sm
                            text-slate-700
                            outline-none
                            transition
                            hover:border-slate-300
                            focus:border-blue-500
                            focus:ring-2
                            focus:ring-blue-100
                            disabled:opacity-60
                            sm:w-auto
                            sm:min-w-[210px]
                        "
                    >
                        {STATUS_OPTIONS.map((option) => (
                            <option
                                key={option.value}
                                value={option.value}
                            >
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <div
                        className="
                            pointer-events-none
                            absolute
                            right-4
                            top-1/2
                            -translate-y-1/2
                            text-xs
                            text-slate-400
                        "
                    >
                        ▼
                    </div>
                </div>

                {/* Search Button */}

                <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching || disabled}
                    className="
                        flex
                        h-11
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        bg-blue-600
                        px-7
                        text-sm
                        font-semibold
                        text-white
                        shadow-sm
                        transition
                        hover:bg-blue-700
                        hover:shadow-md
                        active:scale-[0.98]
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                    "
                >
                    {searching ? (
                        <Loader2
                            size={18}
                            className="animate-spin"
                        />
                    ) : (
                        <Search size={18} />
                    )}

                    <span>
                        {searching
                            ? "Searching..."
                            : "Search"}
                    </span>
                </button>
            </div>

            {/* =================================================
                Result Meta
            ================================================= */}

            <div
                className="
                    mt-3
                    flex
                    min-h-[18px]
                    flex-col
                    gap-1
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                "
            >
                {searching && (
                    <p className="text-xs font-medium text-blue-600">
                        Searching reports...
                    </p>
                )}

                {!searching &&
                    isActive &&
                    resultMeta && (
                        <p className="text-xs font-medium text-slate-500">
                            Found{" "}
                            {resultMeta.reportCount ??
                                resultMeta.matched ??
                                0}{" "}
                            reports
                            {typeof resultMeta.matched ===
                                "number" &&
                                ` (${resultMeta.matched} on map)`}
                        </p>
                    )}
            </div>
        </div>
    );
}