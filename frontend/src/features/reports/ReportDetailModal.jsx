import React from 'react';
import { X, User, MapPin, Clock, FileDigit, AlertCircle, BrainCircuit } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import DetailItem from '../../components/ui/DetailItem';
import { BASE_URL } from '../../services/api';

export default function ReportDetailModal({ isOpen, report, onClose, onUpdateStatus }) {
  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[2rem] max-w-4xl w-full shadow-2xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-6 right-6 bg-slate-100 text-slate-500 p-2 rounded-full hover:bg-red-500 hover:text-white transition-all z-20 shadow-sm">
          <X size={20}/>
        </button>
        <div className="flex flex-col md:flex-row max-h-[90vh] overflow-y-auto md:overflow-hidden">
          <div className="md:w-1/2 bg-slate-200 flex items-center justify-center relative min-h-[300px]">
            {report?.image_filename
              ? <img src={`${BASE_URL}/uploads/${report.image_filename}`} className="w-full h-full object-cover" alt="Road damage" onError={(e) => { e.target.style.display='none'; }}/>
              : <div className="flex flex-col items-center text-slate-400 opacity-50"><p className="text-[10px] font-black uppercase tracking-[0.2em]">Image Not Found</p></div>}
            <div className="absolute bottom-4 left-4">
              <StatusBadge status={report.status} size="lg"/>
            </div>
          </div>

          <div className="md:w-1/2 p-10 flex flex-col bg-white overflow-y-auto">
            <div className="mb-4">
              <h2 className="text-3xl font-black text-slate-800 mb-1 leading-tight">รายละเอียดรายงาน</h2>
              <p className="text-slate-400 font-mono text-xs tracking-tighter uppercase">Report ID: {report.id}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 mb-6 flex-1">
              <DetailItem icon={<User className="text-blue-500"/>} label="ผู้รายงาน" value={report.reporter_name || "ไม่ระบุชื่อ"}/>
              <DetailItem
                icon={<MapPin className="text-red-500"/>}
                label="ตำแหน่งพิกัด"
                value={report.latitude
                  ? <span className="flex items-center gap-2">
                      {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase border border-slate-200">{report.gps_source || 'Unknown'}</span>
                    </span>
                  : "ไม่มีข้อมูล GPS"}
              />
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><Clock size={12}/> วันเวลาที่บันทึก</p>
                  <p className="text-sm font-bold text-slate-700">{report.created_at ? new Date(report.created_at).toLocaleString('th-TH') : '-'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><FileDigit size={12}/> ข้อมูลไฟล์ภาพ</p>
                  <p className="text-sm font-bold text-slate-700">
                    {report.image_size_bytes ? (report.image_size_bytes/1024).toFixed(1)+' KB' : 'N/A'}
                    <span className="text-[10px] text-slate-400 font-normal block mt-0.5">{report.image_mime_type||'Unknown Type'}</span>
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-widest flex items-center gap-2"><AlertCircle size={12}/> คำอธิบายเพิ่มเติม</p>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-600 text-sm italic leading-relaxed shadow-inner">
                  "{report.description || "ไม่มีคำอธิบายเพิ่มเติม"}"
                </div>
              </div>
            </div>

            {report.ai_result && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-[10px] text-blue-500 font-black uppercase mb-3 tracking-widest flex items-center gap-2"><BrainCircuit size={14}/> ข้อมูลเชิงลึกจาก AI</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100">
                    <p className="text-[10px] text-rose-400 font-bold uppercase mb-1">ความเสียหาย</p>
                    <p className="text-xl font-black text-rose-600">{Number(report.ai_result.cv_features?.cv_damage_ratio_percent).toFixed(2)}%</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-2xl border border-orange-100">
                    <p className="text-[10px] text-orange-400 font-bold uppercase mb-1">ระดับความรุนแรง</p>
                    <p className="text-xl font-black text-orange-600">Lv.{report.ai_result.cv_features?.cv_max_severity_score}</p>
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-xs text-blue-800 space-y-1.5">
                  <p>🛣️ <span className="font-bold">ประเภทถนน:</span> {report.ai_result.context_data?.gis?.thai_road_type}</p>
                  <p>🌧️ <span className="font-bold">ฝนตกสะสม:</span> {report.ai_result.context_data?.gee?.rainfall_last_12m_mm} mm</p>
                  <p>👥 <span className="font-bold">ประวัติแจ้งซ้ำ:</span> {report.ai_result.context_data?.crowdsource?.crowdsource_report_count_30d} ครั้ง</p>
                </div>

                {/* ✅ โค้ดแสดงผล Late Fusion */}
                {report.ai_result.fusion_result && (
                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-sm mt-3">
                    <p className="font-bold text-purple-800 mb-1 flex items-center gap-2">🎯 สรุปผลประเมิน (Late Fusion)</p>
                    <div className="text-xl font-black text-purple-600 mb-1">{report.ai_result.fusion_result.final_decision}</div>
                    <p className="text-xs text-purple-400">คะแนนความเสี่ยงสุทธิ: {Number(report.ai_result.fusion_result.fusion_score).toFixed(2)}</p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 mt-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {['pending','processing','completed','rejected'].map(s => (
                  <button key={s} onClick={() => onUpdateStatus(report.id, s)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${report.status===s ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-300 hover:text-blue-500'}`}>
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
