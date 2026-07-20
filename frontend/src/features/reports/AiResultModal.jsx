import React from 'react';
import { MapPin, AlertTriangle, Scan, Activity } from 'lucide-react';
import { normalizeAiResult } from '../../utils/aiNormalization';
import { BASE_URL } from '../../services/api';

export default function AiResultModal({ aiResult, onClose }) {
  const normalized = normalizeAiResult(aiResult);
  if (!normalized) return null;

  const { isPartial, cvFeatures, contextData, fusionResult, annotatedImage } = normalized;

  return (
    <div className="fixed inset-0 bg-ink/55 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-paper rounded-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row border border-line max-h-[90vh]">
        <div className="md:w-1/2 bg-asphalt relative flex items-center justify-center overflow-hidden min-h-[260px]">
          {annotatedImage ? (
            <img
              src={`${BASE_URL}/uploads/${annotatedImage}`}
              alt="ผลการตรวจจับความเสียหาย"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-paper/50 flex flex-col items-center">
              <Scan size={40} className="mb-2 opacity-60" />
              <p className="text-xs font-medium">ไม่มีภาพประกอบ</p>
            </div>
          )}
          <div className="absolute top-3 left-3 bg-ink/75 text-paper px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5">
            <Scan size={12} className="text-mark" />
            ผลวิเคราะห์ภาพ
          </div>
        </div>

        <div className="md:w-1/2 flex flex-col max-h-[85vh]">
          <div className="bg-ink px-5 py-5 text-paper shrink-0">
            <p className="text-[11px] text-mark font-semibold tracking-wide">ถนนแจ้ง · AI</p>
            <h2 className="font-display text-xl mt-1">วิเคราะห์เสร็จแล้ว</h2>
            {isPartial && (
              <div className="mt-3 bg-mark/15 text-mark text-[12px] font-medium py-1.5 px-3 rounded-lg inline-flex items-center gap-1.5 border border-mark/30">
                <AlertTriangle size={14} />
                วิเคราะห์เฉพาะภาพ เนื่องจากไม่พบพิกัด GPS
              </div>
            )}
          </div>

          <div className="p-5 space-y-3 overflow-y-auto flex-1 bg-mist/40">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-paper border border-line p-3.5 rounded-xl">
                <p className="text-xs text-asphalt/55 mb-1">พื้นที่เสียหาย</p>
                <p className="font-display text-2xl text-danger">
                  {Number(cvFeatures?.cv_damage_ratio_percent || 0).toFixed(2)}%
                </p>
              </div>
              <div className="bg-paper border border-line p-3.5 rounded-xl">
                <p className="text-xs text-asphalt/55 mb-1">ระดับความรุนแรง</p>
                <p className="font-display text-2xl text-warn">
                  Lv.{cvFeatures?.cv_max_severity_score || 0}
                </p>
              </div>
            </div>

            {cvFeatures?.cv_details && Object.keys(cvFeatures.cv_details).length > 0 && (
              <div className="bg-paper border border-line p-3.5 rounded-xl">
                <p className="text-xs text-asphalt/55 mb-2 flex items-center gap-1.5">
                  <Activity size={12} /> ประเภทความเสียหายที่พบ
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(cvFeatures.cv_details).map(
                    ([cls, count]) =>
                      count > 0 && (
                        <span
                          key={cls}
                          className="bg-mist text-ink px-2 py-1 rounded-md text-xs font-semibold border border-line"
                        >
                          {cls}: <span className="text-danger">{count}</span>
                        </span>
                      )
                  )}
                </div>
              </div>
            )}

            {contextData && (
              <div className="bg-paper border border-line p-3.5 rounded-xl text-sm">
                <p className="font-semibold text-ink mb-2 flex items-center gap-2 text-xs">
                  <MapPin size={14} className="text-info" /> ข้อมูลพื้นที่
                </p>
                <ul className="space-y-1.5 text-asphalt/75 text-[13px] grid grid-cols-2 gap-x-2">
                  <li>
                    <span className="block text-xs text-asphalt/45">ประเภทถนน</span>
                    {contextData?.gis?.thai_road_type || '-'}
                  </li>
                  <li>
                    <span className="block text-xs text-asphalt/45">วัสดุพื้นผิว</span>
                    {contextData?.gee?.estimated_material || '-'}
                  </li>
                  <li>
                    <span className="block text-xs text-asphalt/45">ความชื้นดิน</span>
                    {contextData?.gee?.soil_moisture_last_30d_mm || 0}
                  </li>
                  <li>
                    <span className="block text-xs text-asphalt/45">ฝนสะสม</span>
                    {contextData?.gee?.rainfall_last_12m_mm || 0} มม.
                  </li>
                  <li className="col-span-2">
                    <span className="block text-xs text-asphalt/45">แจ้งซ้ำใน 30 วัน</span>
                    {contextData?.crowdsource?.crowdsource_report_count_30d || 0} ครั้ง
                  </li>
                </ul>
              </div>
            )}

            {fusionResult && (
              <div className="bg-ink text-paper p-3.5 rounded-xl">
                <p className="text-xs text-mark font-semibold mb-1">สรุปผลการประเมิน</p>
                <div className="font-display text-xl">
                  {fusionResult?.final_decision || 'ไม่ระบุ'}
                </div>
                <p className="text-xs text-paper/55 mt-1">
                  คะแนนความเร่งด่วน: {Number(fusionResult?.fusion_score || 0).toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <div className="p-4 bg-paper border-t border-line shrink-0">
            <button
              onClick={onClose}
              className="w-full bg-ink text-paper py-3 rounded-xl font-display hover:bg-ink-soft transition-colors"
            >
              รับทราบ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
