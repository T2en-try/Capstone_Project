import React from 'react';
import { BrainCircuit, MapPin, AlertTriangle, Scan, Activity } from 'lucide-react';
import { normalizeAiResult } from '../../utils/aiNormalization';
import { BASE_URL } from '../../services/api';

export default function AiResultModal({ aiResult, onClose }) {
  const normalized = normalizeAiResult(aiResult);
  if (!normalized) return null;

  const { isPartial, cvFeatures, contextData, fusionResult, annotatedImage } = normalized;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Annotated Image */}
        <div className="md:w-1/2 bg-slate-900 relative flex items-center justify-center overflow-hidden min-h-[300px]">
          {annotatedImage ? (
            <img src={`${BASE_URL}/uploads/${annotatedImage}`} alt="AI Detection" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
          ) : (
            <div className="text-slate-500 flex flex-col items-center">
              <Scan size={48} className="mb-2 opacity-50" />
              <p className="text-xs font-bold uppercase tracking-widest">No Image Available</p>
            </div>
          )}
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-xl">
            <Scan size={12} className="text-blue-400" />
            AI Vision
          </div>
        </div>

        {/* Right Side: Metrics */}
        <div className="md:w-1/2 flex flex-col max-h-[85vh]">
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-white text-center shrink-0">
            <BrainCircuit size={40} className="mx-auto mb-2 opacity-90"/>
            <h2 className="text-xl font-black tracking-tight">AI Analysis Complete</h2>
            {isPartial && (
              <div className="mt-3 bg-amber-500/20 text-amber-100 text-[11px] font-bold py-1.5 px-3 rounded-full inline-flex items-center gap-1.5 border border-amber-400/30">
                <AlertTriangle size={14} /> วิเคราะห์เฉพาะภาพ (CV Only) เนื่องจากไม่พบ GPS
              </div>
            )}
          </div>
          
          <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-slate-50">
            {/* Defect Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">พื้นที่เสียหาย</p>
                <p className="text-2xl font-black text-rose-500">{Number(cvFeatures?.cv_damage_ratio_percent || 0).toFixed(2)}%</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">ความรุนแรง</p>
                <p className="text-2xl font-black text-orange-500">Lv.{cvFeatures?.cv_max_severity_score || 0}</p>
              </div>
            </div>

            {/* Breakdown */}
            {cvFeatures?.cv_details && Object.keys(cvFeatures.cv_details).length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 flex items-center gap-1.5"><Activity size={12} /> รายละเอียดรอยร้าว (Defects)</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(cvFeatures.cv_details).map(([cls, count]) => count > 0 && (
                    <span key={cls} className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold border border-slate-200">
                      {cls}: <span className="text-rose-500">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {contextData && (
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 text-sm shadow-sm">
                <p className="font-bold text-blue-800 mb-2 flex items-center gap-2 text-xs uppercase tracking-wider"><MapPin size={14}/> ข้อมูลพื้นที่ (Context)</p>
                <ul className="space-y-1.5 text-slate-600 text-[11px] grid grid-cols-2 gap-x-2">
                  <li><span className="font-bold block">🛣️ ประเภทถนน</span> {contextData?.gis?.thai_road_type || 'N/A'}</li>
                  <li><span className="font-bold block">🧱 วัสดุพื้นผิว</span> {contextData?.gee?.estimated_material || 'N/A'}</li>
                  <li><span className="font-bold block">💧 ความชื้นดิน</span> {contextData?.gee?.soil_moisture_last_30d_mm || 0}</li>
                  <li><span className="font-bold block">🌧️ ฝนตกสะสม</span> {contextData?.gee?.rainfall_last_12m_mm || 0} mm</li>
                  <li className="col-span-2"><span className="font-bold block">👥 แจ้งเหตุซ้ำ (30 วัน)</span> {contextData?.crowdsource?.crowdsource_report_count_30d || 0} ครั้ง</li>
                </ul>
              </div>
            )}
            
            {fusionResult && (
              <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 shadow-sm">
                <p className="font-bold text-purple-800 mb-1 flex items-center gap-2 text-xs uppercase tracking-wider">🎯 สรุปผลประเมิน (Late Fusion)</p>
                <div className="text-xl font-black text-purple-600 mb-0.5">{fusionResult?.final_decision || 'Unknown'}</div>
                <p className="text-[10px] text-purple-400 font-bold uppercase">Priority Score: {Number(fusionResult?.fusion_score || 0).toFixed(2)}</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-100 text-center shrink-0">
            <button onClick={onClose} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-md">
              รับทราบและปิดหน้าต่าง
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
