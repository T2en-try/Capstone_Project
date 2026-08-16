import React, { useState } from 'react';
import { Camera, MapPinned, ImageIcon, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * แผงแจ้งซ่อม — โทนสว่าง กึ่งทางการ อ่านง่ายสำหรับประชาชน
 */

/**
 * ข้อมูลรูปตัวอย่างการถ่ายภาพ
 * -------------------------------------------------------
 * ผู้พัฒนา: เปลี่ยน src ของแต่ละรายการเป็น path รูปจริง
 * ไฟล์รูปควรวางไว้ที่: public/guide-images/
 *   - example-1.svg (หรือ .jpg/.png) → ตัวอย่างหลุมบ่อ
 *   - example-2.svg                   → ตัวอย่างถนนแตกร้าว
 *   - example-3.svg                   → ตัวอย่างรูปที่ไม่เหมาะสม
 * -------------------------------------------------------
 */
const PHOTO_EXAMPLES = [
  {
    id: 1,
    src: '/guide-images/example-1.svg',   // ← แทนที่ด้วยรูปจริง
    alt: 'ตัวอย่างถ่ายภาพหลุมบ่อ',
    label: 'หลุมบ่อ — มองเห็นชัด',
    tip: 'ถ่ายระยะใกล้ให้เห็นขอบและความลึกของหลุม',
    good: true,
  },
  {
    id: 2,
    src: '/guide-images/example-2.svg',   // ← แทนที่ด้วยรูปจริง
    alt: 'ตัวอย่างถ่ายภาพถนนแตกร้าว',
    label: 'รอยแตกร้าว — มองเห็นครบ',
    tip: 'ถ่ายให้เห็นรอยแตกตลอดแนว ไม่ตัดขอบรูป',
    good: true,
  },
  {
    id: 3,
    src: '/guide-images/example-3.svg',   // ← แทนที่ด้วยรูปจริง
    alt: 'ตัวอย่างรูปที่ไม่เหมาะสม',
    label: 'ภาพมืด / เบลอ — หลีกเลี่ยง',
    tip: 'AI ไม่สามารถวิเคราะห์ภาพที่มืดหรือขยับมือได้',
    good: false,
  },
];

function PhotoGuideCard() {
  const [current, setCurrent] = useState(0);
  const total = PHOTO_EXAMPLES.length;
  const example = PHOTO_EXAMPLES[current];

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  return (
    <div className="bg-paper/90 border border-line rounded-2xl p-5 anim-rise flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ImageIcon size={16} className="text-mark-deep shrink-0" />
        <p className="font-display text-sm text-ink leading-tight">ตัวอย่างการถ่ายภาพ</p>
        <span className="ml-auto text-[11px] font-medium text-asphalt/45 tabular-nums">
          {current + 1} / {total}
        </span>
      </div>

      {/* Image area */}
      <div className="relative overflow-hidden rounded-xl border border-line bg-mist/40 aspect-[4/3]">
        <img
          key={example.id}
          src={example.src}
          alt={example.alt}
          className="w-full h-full object-cover transition-opacity duration-300"
          onError={(e) => {
            /* หากรูปยังไม่มี แสดง placeholder ข้อความ */
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling.style.display = 'flex';
          }}
        />
        {/* Fallback placeholder เมื่อยังไม่มีรูปจริง */}
        <div
          className="absolute inset-0 hidden flex-col items-center justify-center gap-2 bg-mist/60"
          aria-hidden="true"
        >
          <ImageIcon size={32} className="text-asphalt/30" />
          <span className="text-xs text-asphalt/40">รอผู้พัฒนาเพิ่มรูปตัวอย่าง</span>
        </div>

        {/* Good / Bad badge */}
        <div className={`absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold backdrop-blur-sm ${
          example.good
            ? 'bg-emerald-500/90 text-white'
            : 'bg-red-500/90 text-white'
        }`}>
          {example.good
            ? <CheckCircle2 size={12} />
            : <XCircle size={12} />}
          {example.good ? 'ตัวอย่างที่ดี' : 'หลีกเลี่ยง'}
        </div>

        {/* Prev / Next arrows */}
        <button
          type="button"
          onClick={prev}
          aria-label="ภาพก่อนหน้า"
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-ink/60 text-paper hover:bg-ink transition-colors backdrop-blur-sm"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="ภาพถัดไป"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-ink/60 text-paper hover:bg-ink transition-colors backdrop-blur-sm"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Caption */}
      <div>
        <p className="text-xs font-semibold text-ink leading-snug">{example.label}</p>
        <p className="text-[11px] text-asphalt/60 mt-0.5 leading-relaxed">{example.tip}</p>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5">
        {PHOTO_EXAMPLES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`ไปยังภาพที่ ${i + 1}`}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === current ? 'w-4 bg-mark-deep' : 'w-1.5 bg-asphalt/25'
            }`}
          />
        ))}
      </div>

      {/* Note for developer */}
      {/* DEV NOTE: เปลี่ยน src ใน PHOTO_EXAMPLES array ด้านบน และวางรูปจริงใน public/guide-images/ */}
    </div>
  );
}

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

      {/* ── ส่วนตัวอย่างการถ่ายภาพ (UI เท่านั้น ไม่เปลี่ยน Logic) ── */}
      <PhotoGuideCard />
    </aside>
  );
}
