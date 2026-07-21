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
    <div className="bg-white rounded-xl shadow-md p-4">

      <div className="flex flex-col lg:flex-row gap-4">

        {/* Search */}

        <div className="relative flex-1">

          <Search
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            placeholder="กรอกคำสำคัญของเรื่องแจ้ง เช่น รหัสเรื่อง."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 outline-none focus:border-orange-500"
          />

        </div>

        {/* Status */}

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-orange-500"
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
          className="flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-6 py-2 text-white hover:bg-orange-600 transition"
        >
          <Filter size={18} />
          ค้นหา
        </button>

      </div>

    </div>
  );
}