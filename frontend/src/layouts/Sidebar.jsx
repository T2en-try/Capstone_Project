import React from 'react';
import { Camera, MapPinned } from 'lucide-react';

/**
 * แผงแจ้งซ่อม — โทนสว่าง กึ่งทางการ อ่านง่ายสำหรับประชาชน
 */
export default function Sidebar({ formData, setFormData, handleFileChange, loading }) {
  return (
    <aside className="w-full lg:w-[340px] shrink-0 flex flex-col gap-5">
      <div className="bg-paper/90 border border-line rounded-2xl p-5 anim-rise">
        <p className="font-display text-lg text-ink leading-tight">แจ้งซ่อมถนน</p>
        <p className="text-sm text-asphalt/65 mt-1 leading-relaxed">
          ถ่ายรูปถนนที่ชำรุด แล้วส่งเข้าสู่ระบบ — ใช้เวลาไม่ถึงหนึ่งนาที
        </p>

        <ol className="mt-4 space-y-2 text-sm text-asphalt/75">
          <li className="flex gap-2">
            <span className="font-display text-mark-deep w-5 shrink-0">1.</span>
            กรอกชื่อและรายละเอียดสั้น ๆ
          </li>
          <li className="flex gap-2">
            <span className="font-display text-mark-deep w-5 shrink-0">2.</span>
            เลือกรูปหรือถ่ายภาพถนน
          </li>
          <li className="flex gap-2">
            <span className="font-display text-mark-deep w-5 shrink-0">3.</span>
            ถ้ารูปไม่มีพิกัด ระบบจะให้ปักหมุดบนแผนที่
          </li>
        </ol>

        <div className="mt-5 flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5">
              ชื่อผู้แจ้ง
            </label>
            <input
              type="text"
              placeholder="ชื่อของคุณ"
              className="w-full bg-white border border-line px-3.5 py-3 rounded-xl text-sm outline-none focus:border-ink-soft focus:ring-2 focus:ring-ink/10 transition-all placeholder:text-asphalt/35"
              value={formData.reporter_name}
              onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5">
              รายละเอียดเพิ่มเติม
            </label>
            <textarea
              placeholder="เช่น หลุมบ่อขนาดใหญ่ หน้าปากซอย..."
              className="w-full bg-white border border-line px-3.5 py-3 rounded-xl text-sm h-24 outline-none focus:border-ink-soft focus:ring-2 focus:ring-ink/10 transition-all resize-none placeholder:text-asphalt/35"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <label
            className={`block w-full text-center py-3.5 rounded-xl font-display text-base cursor-pointer transition-all ${
              loading
                ? 'bg-asphalt/25 text-asphalt/50 cursor-wait'
                : 'bg-ink text-paper hover:bg-ink-soft active:scale-[0.99]'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Camera size={18} />
              {loading ? 'กำลังส่งและวิเคราะห์...' : 'ถ่ายภาพ / เลือกรูปแล้วส่ง'}
            </span>
            <input
              type="file"
              hidden
              onChange={handleFileChange}
              accept="image/*"
              disabled={loading}
            />
          </label>

          <div className="flex items-start gap-2 text-xs text-asphalt/60 leading-relaxed">
            <MapPinned size={14} className="text-mark-deep shrink-0 mt-0.5" />
            <p>
              ระบบอ่านพิกัดจากรูปอัตโนมัติ หากไม่มี จะเปิดแผนที่ให้ระบุตำแหน่งด้วยตนเอง
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
