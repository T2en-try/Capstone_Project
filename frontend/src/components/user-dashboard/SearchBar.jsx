import { Search, Filter, X, Loader2 } from "lucide-react";
import { useState } from "react";

const STATUS_OPTIONS = [
    { value: "all", label: "ทุกสถานะ" },
    { value: "pending", label: "รอดำเนินการ" },
    { value: "processing", label: "กำลังดำเนินการ" },
    { value: "completed", label: "ซ่อมเสร็จแล้ว" },
    { value: "rejected", label: "ปฏิเสธ" },
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

    const hasFilter = keyword.trim() !== "" || status !== "all";
    const isActive = resultMeta?.active ?? hasFilter;

    return (
        <div className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mark/10">
                        <Filter size={18} className="text-mark-deep" />
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-asphalt">
                            ค้นหาและกรองข้อมูล
                        </h3>
                        <p className="text-xs text-asphalt/50">
                            กด Enter เพื่อค้นหาอย่างรวดเร็ว • เปลี่ยนสถานะจะกรองทันที
                        </p>
                    </div>
                </div>

                {hasFilter && (
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={searching || disabled}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-asphalt/60 transition hover:bg-asphalt/5 hover:text-asphalt disabled:opacity-50"
                    >
                        <X size={14} />
                        ล้างตัวกรอง
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                    <Search
                        size={19}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-asphalt/40"
                    />

                    <input
                        type="text"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="ค้นหารหัสเรื่อง ชื่อถนน หรือรายละเอียด..."
                        aria-label="ค้นหารายงาน"
                        disabled={searching || disabled}
                        className="h-11 w-full rounded-xl border border-line bg-paper pl-11 pr-4 text-sm text-asphalt outline-none transition placeholder:text-asphalt/40 hover:border-asphalt/30 focus:border-mark focus:ring-2 focus:ring-mark/10 disabled:opacity-60"
                    />
                </div>

                <div className="relative">
                    <select
                        value={status}
                        onChange={handleStatusChange}
                        aria-label="กรองตามสถานะ"
                        disabled={searching || disabled}
                        className="h-11 min-w-[210px] appearance-none rounded-xl border border-line bg-paper px-4 pr-10 text-sm text-asphalt outline-none transition hover:border-asphalt/30 focus:border-mark focus:ring-2 focus:ring-mark/10 disabled:opacity-60"
                    >
                        {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-asphalt/40">
                        ▼
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-mark px-7 text-sm font-semibold text-paper shadow-sm transition hover:bg-mark-deep hover:shadow-md active:scale-[0.98] disabled:opacity-60"
                >
                    {searching ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Search size={18} />
                    )}
                    <span>{searching ? "กำลังค้นหา..." : "ค้นหา"}</span>
                </button>
            </div>

            <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            

                {searching && (
                    <p className="text-xs font-medium text-mark-deep">
                        กำลังค้นหา...
                    </p>
                )}

                {!searching && isActive && resultMeta && (
                    <p className="text-xs font-medium text-asphalt/60">
                        พบ {resultMeta.reportCount ?? resultMeta.matched} รายการ
                        {typeof resultMeta.matched === "number" &&
                            ` (${resultMeta.matched} บนแผนที่)`}
                    </p>
                )}
            </div>
        </div>
    );
}
