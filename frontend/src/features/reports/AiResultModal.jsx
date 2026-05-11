import React from 'react';
import { BrainCircuit, MapPin } from 'lucide-react';

export default function AiResultModal({ aiResult, onClose }) {
  if (!aiResult) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white text-center">
          <BrainCircuit size={48} className="mx-auto mb-3 opacity-90"/>
          <h2 className="text-2xl font-black tracking-tight">AI Analysis Complete!</h2>
          <p className="text-sm opacity-80 mt-1">ระบบวิเคราะห์สภาพถนนและสิ่งแวดล้อมเสร็จสิ้น</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-xs text-slate-400 font-bold uppercase mb-1">พื้นที่เสียหาย</p>
              <p className="text-2xl font-black text-rose-500">{Number(aiResult.cv_features?.cv_damage_ratio_percent).toFixed(2)}%</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-xs text-slate-400 font-bold uppercase mb-1">ความรุนแรงสูงสุด</p>
              <p className="text-2xl font-black text-orange-500">Lv.{aiResult.cv_features?.cv_max_severity_score}</p>
            </div>
          </div>
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 text-sm">
            <p className="font-bold text-blue-800 mb-2 flex items-center gap-2"><MapPin size={16}/> ข้อมูลพื้นที่ (Context)</p>
            <ul className="space-y-2 text-slate-600">
              <li>🛣️ <span className="font-medium">ประเภทถนน:</span> {aiResult.context_data?.gis?.thai_road_type}</li>
              <li>🧱 <span className="font-medium">วัสดุพื้นผิว:</span> {aiResult.context_data?.gee?.estimated_material}</li>
              <li>💧 <span className="font-medium">ความชื้นดิน:</span> {aiResult.context_data?.gee?.soil_moisture_last_30d_mm}</li>
              <li>🌿 <span className="font-medium">ดัชนีพืชพรรณ (NDVI):</span> {aiResult.context_data?.gee?.ndvi_index}</li>
              <li>💡 <span className="font-medium">แสงสว่างกลางคืน:</span> {aiResult.context_data?.gee?.nightlight_radiance}</li>
              <li>🌧️ <span className="font-medium">ฝนตกสะสม:</span> {aiResult.context_data?.gee?.rainfall_last_12m_mm} mm</li>
              <li>👥 <span className="font-medium">แจ้งเหตุซ้ำ:</span> {aiResult.context_data?.crowdsource?.crowdsource_report_count_30d} ครั้ง</li>
            </ul>
          </div>
          
          {/* ✅ โค้ดแสดงผล Late Fusion */}
          {aiResult.fusion_result && (
            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-sm mt-3">
              <p className="font-bold text-purple-800 mb-1 flex items-center gap-2">🎯 สรุปผลประเมิน (Late Fusion)</p>
              <div className="text-xl font-black text-purple-600 mb-1">{aiResult.fusion_result.final_decision}</div>
              <p className="text-xs text-purple-400">คะแนนความเสี่ยงสุทธิ: {Number(aiResult.fusion_result.fusion_score).toFixed(2)}</p>
            </div>
          )}

        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <button onClick={onClose} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95">
            รับทราบและปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
