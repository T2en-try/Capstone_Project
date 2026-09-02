import React, { useState } from 'react';
import {
  X, User, MapPin, Clock, FileDigit, AlertCircle, AlertTriangle, Scan, Activity, Image as ImageIcon
} from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import DetailItem from '../../components/ui/DetailItem';
import { BASE_URL } from '../../services/api';
import { normalizeAiResult } from '../../utils/aiNormalization';
import GpsPinModal from './GpsPinModal';

const STATUS_LABELS = {
  pending: 'รอรับเรื่อง',
  processing: 'กำลังดำเนินการ',
  completed: 'เสร็จสิ้น',
  rejected: 'ไม่ผ่านการตรวจ',
};

const REJECTION_REASON_LABELS = {
  not_a_road: 'ภาพที่แจ้งไม่ใช่ภาพถนน (ตรวจพบโดยระบบอัตโนมัติ)',
  analysis_failed: 'ระบบวิเคราะห์ภาพผิดพลาด กรุณาลองแจ้งใหม่อีกครั้ง',
};

export default function ReportDetailModal({ isOpen, report, onClose, onUpdateStatus, onConfirmLocation }) {
  const [showAiImage, setShowAiImage] = useState(false);
  const [showGpsConfirm, setShowGpsConfirm] = useState(false);
  if (!isOpen || !report) return null;

  const aiResult = normalizeAiResult(report.ai_result);
  // const [showAiImage, setShowAiImage] = useState(false);
  const hasAiImage = aiResult?.annotatedImage != null;
  const currentImage = showAiImage && hasAiImage ? aiResult.annotatedImage : report.image_filename;
  const gpsAnomalyFlagged = report.ai_analysis?.gps_anomaly_flagged === true;

  const handleLocationConfirm = (lat, lon) => {
    setShowGpsConfirm(false);
    onConfirmLocation?.(report.id, lat, lon);
  };

  return (
    <div className="fixed inset-0 bg-ink/55 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-paper rounded-2xl max-w-4xl w-full overflow-hidden relative border border-line max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-mist text-asphalt/60 hover:bg-danger hover:text-paper transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col md:flex-row max-h-[90vh] overflow-y-auto md:overflow-hidden">
          <div className="md:w-1/2 bg-asphalt flex items-center justify-center relative min-h-[280px] overflow-hidden">
            {currentImage ? (
              <img
                src={`${BASE_URL}/uploads/${currentImage}`}
                className="w-full h-full object-cover"
                alt="ภาพถนนที่แจ้ง"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <p className="text-paper/40 text-sm">ไม่พบภาพ</p>
            )}

            {hasAiImage && (
              <div className="absolute top-3 left-3 flex bg-ink/70 rounded-lg p-1 z-10">
                <button
                  onClick={() => setShowAiImage(false)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                    !showAiImage ? 'bg-paper text-ink' : 'text-paper/70 hover:text-paper'
                  }`}
                >
                  <ImageIcon size={12} /> ต้นฉบับ
                </button>
                <button
                  onClick={() => setShowAiImage(true)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                    showAiImage ? 'bg-mark text-ink' : 'text-paper/70 hover:text-paper'
                  }`}
                >
                  <Scan size={12} /> ผล AI
                </button>
              </div>
            )}

            <div className="absolute bottom-3 left-3 z-10">
              <StatusBadge status={report.status} size="lg" />
            </div>
          </div>

          <div className="md:w-1/2 p-6 sm:p-8 flex flex-col bg-paper overflow-y-auto">
            <div className="mb-4 pr-8">
              <h2 className="font-display text-2xl text-ink leading-tight">รายละเอียดการแจ้ง</h2>
              <p className="text-asphalt/45 text-xs mt-1">เลขที่รายงาน {report.id}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-5 flex-1">
              <DetailItem
                icon={<User size={18} />}
                label="ผู้แจ้ง"
                value={report.reporter_name || 'ไม่ระบุชื่อ'}
              />
              <DetailItem
                icon={<MapPin size={18} />}
                label="ตำแหน่งพิกัด"
                value={
                  report.latitude ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm">
                        {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                      </span>
                      <span className="text-[10px] bg-mist text-asphalt/60 px-2 py-0.5 rounded border border-line">
                        {report.gps_source || 'ไม่ระบุแหล่งที่มา'}
                      </span>
                    </span>
                  ) : (
                    'ไม่มีข้อมูล GPS'
                  )
                }
              />

              {report.status === 'rejected' && (
                <div className="bg-danger/10 border border-danger/25 p-3.5 rounded-xl flex items-start gap-2">
                  <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
                  <p className="text-xs text-danger/90 leading-relaxed">
                    {REJECTION_REASON_LABELS[report.rejection_reason] ||
                      'รายงานนี้ไม่ผ่านการตรวจสอบ (ไม่ระบุเหตุผล)'}
                  </p>
                </div>
              )}

              {gpsAnomalyFlagged && (
                <div className="bg-warn/10 border border-warn/25 p-3.5 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <AlertTriangle size={16} className="text-warn shrink-0 mt-0.5" />
                    <p className="text-xs text-warn/90 leading-relaxed">
                      พิกัดนี้อาจไม่ตรงกับภาพที่แจ้ง (ตรวจพบจากข้อมูลพืชพรรณ) กรุณายืนยัน
                      หรือปักหมุดตำแหน่งใหม่
                    </p>
                  </div>
                  <button
                    onClick={() => setShowGpsConfirm(true)}
                    className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold bg-warn text-ink hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    ยืนยัน/แก้ไขตำแหน่ง
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-mist border border-line p-3.5 rounded-xl">
                  <p className="text-xs text-asphalt/50 mb-1 flex items-center gap-1">
                    <Clock size={12} /> วันเวลาที่แจ้ง
                  </p>
                  <p className="text-sm font-semibold text-ink">
                    {report.created_at ? new Date(report.created_at).toLocaleString('th-TH') : '-'}
                  </p>
                </div>
                <div className="bg-mist border border-line p-3.5 rounded-xl">
                  <p className="text-xs text-asphalt/50 mb-1 flex items-center gap-1">
                    <FileDigit size={12} /> ขนาดไฟล์ภาพ
                  </p>
                  <p className="text-sm font-semibold text-ink">
                    {report.image_size_bytes
                      ? `${(report.image_size_bytes / 1024).toFixed(1)} KB`
                      : '-'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-asphalt/50 mb-1.5 flex items-center gap-1">
                  <AlertCircle size={12} /> รายละเอียดจากผู้แจ้ง
                </p>
                <div className="bg-mist border border-line p-3.5 rounded-xl text-sm text-asphalt/80 leading-relaxed">
                  {report.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                </div>
              </div>
            </div>

            {aiResult && (
              <div className="border-t border-line pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-semibold text-ink-soft">ผลการวิเคราะห์ AI</p>
                  {aiResult.isPartial && (
                    <span className="bg-mark/15 text-mark-deep text-[10px] font-semibold py-0.5 px-2 rounded border border-mark/30 inline-flex items-center gap-1">
                      <AlertTriangle size={10} /> เฉพาะภาพ
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-danger/5 border border-danger/15 p-3 rounded-xl">
                    <p className="text-xs text-danger/70 mb-0.5">ความเสียหาย</p>
                    <p className="font-display text-xl text-danger">
                      {Number(aiResult.cvFeatures?.cv_damage_ratio_percent || 0).toFixed(2)}%
                    </p>
                  </div>
                  <div className="bg-warn/10 border border-warn/20 p-3 rounded-xl">
                    <p className="text-xs text-warn/80 mb-0.5">ความรุนแรง</p>
                    <p className="font-display text-xl text-warn">
                      Lv.{aiResult.cvFeatures?.cv_max_severity_score || 0}
                    </p>
                  </div>
                </div>

                {aiResult.cvFeatures?.cv_details &&
                  Object.keys(aiResult.cvFeatures.cv_details).length > 0 && (
                    <div className="bg-mist border border-line p-3 rounded-xl mb-3">
                      <p className="text-xs text-asphalt/50 mb-2 flex items-center gap-1.5">
                        <Activity size={12} /> ประเภทความเสียหาย
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(aiResult.cvFeatures.cv_details).map(
                          ([cls, count]) =>
                            count > 0 && (
                              <span
                                key={cls}
                                className="bg-paper text-ink px-2 py-1 rounded-md text-[11px] font-semibold border border-line"
                              >
                                {cls}: <span className="text-danger">{count}</span>
                              </span>
                            )
                        )}
                      </div>
                    </div>
                  )}

                {aiResult.contextData && (
                  <div className="bg-info/5 border border-info/20 p-3.5 rounded-xl text-[13px] text-ink space-y-1">
                    <p>
                      <span className="font-semibold">ประเภทถนน:</span>{' '}
                      {aiResult.contextData?.gis?.thai_road_type || '-'}
                    </p>
                    <p>
                      <span className="font-semibold">ฝนสะสม:</span>{' '}
                      {aiResult.contextData?.gee?.rainfall_last_12m_mm || 0} มม.
                    </p>
                    <p>
                      <span className="font-semibold">ประวัติแจ้งซ้ำ:</span>{' '}
                      {aiResult.contextData?.crowdsource?.crowdsource_report_count_30d || 0} ครั้ง
                    </p>
                  </div>
                )}

                {aiResult.fusionResult && (
                  <div className="bg-ink text-paper p-3.5 rounded-xl text-sm mt-3">
                    <p className="text-xs text-mark font-semibold mb-1">สรุปผลการประเมิน</p>
                    <div className="font-display text-lg">
                      {aiResult.fusionResult?.final_decision || 'ไม่ระบุ'}
                    </div>
                    {aiResult.fusionResult?.confidence_score != null && (
                      <p className="text-xs text-paper/60 mt-1">
                        ความมั่นใจของโมเดล: {(aiResult.fusionResult.confidence_score * 100).toFixed(1)}%
                      </p>
                    )}
                    <p className="text-xs text-paper/50 mt-1">
                      คะแนนความเร่งด่วน:{' '}
                      {Number(aiResult.fusionResult?.fusion_score || 0).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-5 border-t border-line mt-5">
              <p className="text-xs font-semibold text-asphalt/50 mb-2">อัปเดตสถานะ</p>
              <div className="flex flex-wrap gap-2">
                {['pending', 'processing', 'completed', 'rejected'].map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdateStatus(report.id, s)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                      report.status === s
                        ? 'bg-ink text-paper border-ink'
                        : 'bg-paper text-asphalt/55 border-line hover:border-ink-soft hover:text-ink'
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showGpsConfirm && (
        <GpsPinModal
          pendingFile={null}
          onConfirm={handleLocationConfirm}
          onCancel={() => setShowGpsConfirm(false)}
        />
      )}
    </div>
  );
}
