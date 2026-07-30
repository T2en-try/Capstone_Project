import { Search, Filter } from "lucide-react";
import { useState } from "react";

export default function SearchBar() {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");

  const handleSearch = () => {
    console.log({
      keyword,
      status,
    });
  };

  return (
    <div className="bg-paper border border-line rounded-xl shadow-sm p-4">

      <div className="flex flex-col lg:flex-row gap-4">

        {/* Search */}

        <div className="relative flex-1">

          <Search
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-asphalt/40"
          />

          <input
            type="text"
            placeholder="กรอกคำสำคัญของเรื่องแจ้ง เช่น รหัสเรื่อง."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full rounded-xl border border-line bg-paper py-2 pl-10 pr-4 text-asphalt outline-none placeholder:text-asphalt/40 focus:border-ink-soft focus:ring-2 focus:ring-ink/10"
          />

        </div>

        {/* Status */}

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-line bg-paper px-4 py-2 text-asphalt outline-none focus:border-ink-soft focus:ring-2 focus:ring-ink/10"
        >
          <option value="all">ทุกสถานะ</option>
          <option value="pending">รอดำเนินการ</option>
          <option value="working">กำลังดำเนินการ</option>
          <option value="forward">ส่งต่อหน่วยงาน</option>
          <option value="completed">ซ่อมเสร็จแล้ว</option>
        </select>

        {/* Button */}

        <button
          onClick={handleSearch}
          className="flex items-center justify-center gap-2 rounded-xl bg-mark px-6 py-2 text-paper hover:bg-mark-deep transition"
        >
          <Filter size={18} />
          ค้นหา
        </button>

      </div>

    </div>
  );
}