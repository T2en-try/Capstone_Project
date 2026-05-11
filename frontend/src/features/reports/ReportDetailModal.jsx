import React, { useState } from 'react';
import { X, User, MapPin, Clock, FileDigit, AlertCircle, BrainCircuit, AlertTriangle, Scan, Activity, Image as ImageIcon } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import DetailItem from '../../components/ui/DetailItem';
import { BASE_URL } from '../../services/api';
import { normalizeAiResult } from '../../utils/aiNormalization';

export default function ReportDetailModal({ isOpen, report, onClose, onUpdateStatus }) {
  if (!isOpen || !report) return null;

  const aiResult = normalizeAiResult(report.ai_result);
  const [showAiImage, setShowAiImage] = useState(false);
  const hasAiImage = aiResult?.annotatedImage != null;
  const currentImage = (showAiImage && hasAiImage) ? aiResult.annotatedImage : report.image_filename;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[2rem] max-w-4xl w-full shadow-2xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-6 right-6 bg-slate-100 text-slate-500 p-2 rounded-full hover:bg-red-500 hover:text-white transition-all z-20 shadow-sm">
          <X size={20}/>
        </button>
        <div className="flex flex-col md:flex-row max-h-[90vh] overflow-y-auto md:overflow-hidden">
          <div className="md:w-1/2 bg-slate-900 flex items-center justify-center relative min-h-[300px] overflow-hidden">
            {currentImage
              ? <img src={`${BASE_URL}/uploads/${currentImage}`} className="w-full h-full object-cover opacity-90 transition-opacity" alt="Road damage" onError={(e) => { e.target.style.display='none'; }}/>
              : <div className="flex flex-col items-center text-slate-400 opacity-50"><p className="text-[10px] font-black uppercase tracking-[0.2em]">Image Not Found</p></div>}
            
            {hasAiImage && (
              <div className="absolute top-4 left-4 flex bg-black/60 backdrop-blur-md rounded-lg p-1 border border-white/10 shadow-xl z-10">
                <button 
                  onClick={() => setShowAiImage(false)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1.5 transition-all ${!showAiImage ? 'bg-white text-black' : 'text-slate-300 hover:text-white'}`}
                >
                  <ImageIcon size={12} /> Original
                </button>
                <button 
                  onClick={() => setShowAiImage(true)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1.5 transition-all ${showAiImage ? 'bg-blue-500 text-white' : 'text-slate-300 hover:text-white'}`}
                >
                  <Scan size={12} /> AI Detection
                </button>
              </div>
            )}
            
            <div className="absolute bottom-4 left-4 z-10">
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

            {aiResult && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest flex items-center gap-2">
                    <BrainCircuit size={14}/> ข้อมูลเชิงลึกจาก AI
                  </p>
                  {aiResult.isPartial && (
                    <span className="bg-amber-500/20 text-amber-600 text-[9px] font-bold py-0.5 px-2 rounded-md border border-amber-400/30 flex items-center gap-1">
                      <AlertTriangle size={10} /> CV Only
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100">
                    <p className="text-[10px] text-rose-400 font-bold uppercase mb-1">ความเสียหาย</p>
                    <p className="text-xl font-black text-rose-600">{Number(aiResult.cvFeatures?.cv_damage_ratio_percent || 0).toFixed(2)}%</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-2xl border border-orange-100">
                    <p className="text-[10px] text-orange-400 font-bold uppercase mb-1">ระดับความรุนแรง</p>
                    <p className="text-xl font-black text-orange-600">Lv.{aiResult.cvFeatures?.cv_max_severity_score || 0}</p>
                  </div>
                </div>

                {/* Breakdown */}
                {aiResult.cvFeatures?.cv_details && Object.keys(aiResult.cvFeatures.cv_details).length > 0 && (
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 mb-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 flex items-center gap-1.5"><Activity size={12} /> รายละเอียดรอยร้าว (Defects)</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(aiResult.cvFeatures.cv_details).map(([cls, count]) => count > 0 && (
                        <span key={cls} className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[10px] font-bold border border-slate-200">
                          {cls}: <span className="text-rose-500">{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {aiResult.contextData && (
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-xs text-blue-800 space-y-1.5">
                    <p>🛣️ <span className="font-bold">ประเภทถนน:</span> {aiResult.contextData?.gis?.thai_road_type || 'N/A'}</p>
                    <p>🌧️ <span className="font-bold">ฝนตกสะสม:</span> {aiResult.contextData?.gee?.rainfall_last_12m_mm || 0} mm</p>
                    <p>👥 <span className="font-bold">ประวัติแจ้งซ้ำ:</span> {aiResult.contextData?.crowdsource?.crowdsource_report_count_30d || 0} ครั้ง</p>
                  </div>
                )}

                {/* โค้ดแสดงผล Late Fusion */}
                {aiResult.fusionResult && (
                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-sm mt-3">
                    <p className="font-bold text-purple-800 mb-1 flex items-center gap-2">🎯 สรุปผลประเมิน (Late Fusion)</p>
                    <div className="text-xl font-black text-purple-600 mb-1">{aiResult.fusionResult?.final_decision || 'Unknown'}</div>
                    <p className="text-xs text-purple-400">คะแนนความเสี่ยงสุทธิ: {Number(aiResult.fusionResult?.fusion_score || 0).toFixed(2)}</p>
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
