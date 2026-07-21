import React from "react";
import Navbar from "../layouts/Navbar";
// สามารถ Un-comment นำ Component ย่อยมาใส่ได้ตามต้องการ
import NewsSection from "../components/user-dashboard/NewSection";
import MapView from "../components/user-dashboard/MapView";
import StatusCard from "../components/user-dashboard/StatusCard";
import SearchBar from "../components/user-dashboard/SearchBar";

export default function UserDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. ส่วนแถบนำทาง (Navbar Layer) */}
      <Navbar />

      {/* 2. ส่วนเนื้อหาหลัก (Main Content Area) */}
      <main className="flex-1 p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        
        {/* หัวข้อแดชบอร์ดต้อนรับ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <NewsSection />
          </div>
        </div>

        {/* ส่วนข่าวสาร / Search Bar (เปิดใช้งานได้เมื่อพร้อม) */}
        <SearchBar />

        {/* Layout แสดงแผนที่ GIS และการ์ดสถานะ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
        {/* ฝั่งซ้าย: พื้นที่แผนที่ GIS (กินพื้นที่ 8 ช่องบนจอใหญ่) */}
        <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[450px] lg:h-[600px] w-full">
          <MapView />
        </div>

          {/* ฝั่งขวา: การ์ดสรุปสถานะ / รายการแจ้งซ่อม (กินพื้นที่ 4 ช่องบนจอใหญ่) */}
          <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 p-5 min-h-[450px] lg:h-[600px] flex flex-col justify-between">
            <StatusCard />
            <div className="text-center p-6 text-slate-400 my-auto">
              {/* <p className="text-xs mt-1">แสดงรายการแจ้งซ่อมทั้งหมด</p> */}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}