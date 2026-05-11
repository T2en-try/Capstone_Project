import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function Sidebar({ formData, setFormData, handleFileChange, loading }) {
  return (
    <aside className="w-80 bg-slate-900 text-white p-6 hidden lg:flex flex-col shadow-2xl gap-4 overflow-y-auto">
      <h1 className="text-2xl font-black flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 italic drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">
        <LayoutDashboard /> ROAD-PREDICT AI
      </h1>

      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-inner flex flex-col gap-3">
        <p className="text-xs text-blue-400 uppercase font-black tracking-widest">New Report / แจ้งซ่อม</p>
        <input
          type="text" placeholder="ชื่อผู้รายงาน"
          className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm outline-none focus:border-blue-500 transition-all text-white"
          value={formData.reporter_name}
          onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
        />
        <textarea
          placeholder="รายละเอียดสภาพถนน..."
          className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm h-24 outline-none focus:border-blue-500 transition-all resize-none text-white"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
        <label className={`block w-full text-center py-3 rounded-xl font-bold cursor-pointer transition-all shadow-lg ${loading ? 'bg-slate-600 animate-pulse cursor-wait' : 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white'}`}>
          {loading ? "🤖 AI กำลังประมวลผล..." : "ถ่ายภาพ / เลือกรูปภาพ"}
          <input type="file" hidden onChange={handleFileChange} accept="image/*" disabled={loading} />
        </label>
        <p className="text-[10px] text-slate-600 text-center leading-relaxed">หากรูปไม่มีพิกัด GPS ระบบจะให้คุณปักหมุดตำแหน่งเอง</p>
      </div>

      <div className="mt-auto text-[10px] text-slate-500 text-center">Road Lifecycle Management System v1.0</div>
    </aside>
  );
}
