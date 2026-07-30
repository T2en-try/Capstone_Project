import React from 'react';
import { ThumbsUp, ThumbsDown, Eye, Copy } from 'lucide-react';

const NewsSection = () => {
  const reports = [
    {
      id: 1,
      title: 'หลุมบ่อขนาดใหญ่',
      statusColor: 'bg-red-500',
      image: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=300',
      description: 'ถนนมิตรภาพ กม.12 หลุมบ่อกว้างประมาณ 1 เมตร เสี่ยงต่อการเกิดอุบัติเหตุและรถเสียหาย',
      reporter: 'เมืองนครราชสีมา',
      date: '2 ก.ค. 69 08:44 น.',
      duration: 'ใช้เวลา 1:04 ชม.',
      likes: 12,
      dislikes: 0,
      views: 47,
    },
    {
      id: 2,
      title: 'ผิวถนนแตกร้าว',
      statusColor: 'bg-amber-500',
      image: 'https://images.unsplash.com/photo-1594913785162-e6786b327afa?q=80&w=300',
      description: 'ถนนราชสีมา ช่วงหน้าตลาด ผิวถนนแตกร้าวยาวประมาณ 15 เมตร น้ำซึมเข้าผิวทำให้เกิดหลุมต่ำ',
      reporter: 'ปักธงชัย',
      date: '2 ก.ค. 69 07:20 น.',
      duration: 'ใช้เวลา 4:11 ชม.',
      likes: 5,
      dislikes: 0,
      views: 23,
    },
    {
      id: 3,
      title: 'ถนนทรุดตัว',
      statusColor: 'bg-red-500',
      image: 'https://images.unsplash.com/photo-1584467541268-b040f83be3fd?q=80&w=300',
      description: 'ถนนโพธิ์กลาง บริเวณจุดตัดถนนเกิดการทรุดตัว ส่งผลให้การจราจรติดขัดและเสี่ยงต่อยานพาหนะ',
      reporter: 'เมืองนครราชสีมา',
      date: '2 ก.ค. 69 07:05 น.',
      duration: '',
      likes: 8,
      dislikes: 0,
      views: 34,
    },
    {
      id: 4,
      title: 'ไหล่ทางพัง',
      statusColor: 'bg-blue-500',
      image: 'https://images.unsplash.com/photo-1547483238-f400e65ccd56?q=80&w=300',
      description: 'ไหล่ทางถนนสืบศิริถูกน้ำกัดเซาะพังพินาศ เสี่ยงต่อรถเลี้ยวและผู้สัญจร',
      reporter: 'สูงเนิน',
      date: '2 ก.ค. 69 05:06 น.',
      duration: '',
      likes: 3,
      dislikes: 0,
      views: 15,
    },
  ];

  return (
    <section className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">ข่าวแจ้งปัญหาถนนล่าสุด</h2>
          <p className="text-sm text-slate-500">สรุปเหตุการณ์ถนนชำรุดและรายงานพื้นที่ใกล้เคียง</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {reports.map((report) => (
          <article key={report.id} className="group bg-paper rounded-2xl border border-line shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
            <div className="flex gap-3 p-4">
              <img
                src={report.image}
                alt={report.title}
                className="w-24 h-24 rounded-2xl object-cover bg-slate-100 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-ink truncate">{report.title}</h3>
                  <span className={`mt-0.5 h-2.5 w-2.5 rounded-full ${report.statusColor}`} />
                </div>
                <p className="mt-2 text-xs leading-5 text-asphalt/70 line-clamp-4">{report.description}</p>
                <div className="mt-3 text-xs text-asphalt/55 space-y-1">
                  <div>
                    โดย <span className="text-ink font-medium">{report.reporter}</span> · {report.date}
                  </div>
                  {report.duration ? <div className="text-ok font-medium">{report.duration}</div> : null}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-line text-asphalt/60 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <ThumbsUp size={14} />
                  <span>{report.likes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ThumbsDown size={14} />
                  <span>{report.dislikes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye size={14} />
                  <span>{report.views}</span>
                </div>
              </div>
              <button className="inline-flex items-center justify-center rounded-xl p-2 text-asphalt/60 hover:text-ink hover:bg-mist transition-colors" title="คัดลอกลิงก์">
                <Copy size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default NewsSection;