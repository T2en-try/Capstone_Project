import React from "react";
import {
  X,
  MapPin,
  User,
  Calendar,
  FileText,
  Activity,
  Brain,
} from "lucide-react";

const statusMap = {
  pending: {
    label: "รอดำเนินการ",
    className: "bg-red-100 text-red-700",
  },
  processing: {
    label: "กำลังดำเนินการ",
    className: "bg-amber-100 text-amber-700",
  },
  completed: {
    label: "ซ่อมเสร็จแล้ว",
    className: "bg-emerald-100 text-emerald-700",
  },
  rejected: {
    label: "ปฏิเสธ",
    className: "bg-slate-100 text-slate-700",
  },
};

const decisionMap = {
  critical: "วิกฤต",
  warning: "สูง",
  moderate: "ปานกลาง",
  good: "ต่ำ",
};

export default function ReportDetailModal({
  report,
  loading = false,
  error = null,
  onClose,
}) {
  if (!report && !loading && !error) {
    return null;
  }

  const status = statusMap[report?.status] || {
    label: report?.status || "-",
    className: "bg-slate-100 text-slate-700",
  };

  const ai = report?.ai_analysis;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              รายละเอียดรายงาน
            </h2>

            {report && (
              <p className="mt-1 text-xs text-slate-500">
                รายงาน #{report.id}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />

            <p className="mt-4 text-sm text-slate-500">
              กำลังโหลดรายละเอียด...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="p-6">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && !error && report && (
          <div className="space-y-6 p-6">

            {/* Image */}
            {report.image_filename && (
              <div className="overflow-hidden rounded-2xl bg-slate-100">
                <img
                  src={`${import.meta.env.VITE_API_BASE_URL || ""}/uploads/${report.image_filename}`}
                  alt={report.image_original_name || "Road Report"}
                  className="max-h-[400px] w-full object-contain"
                />
              </div>
            )}

            {/* Basic Information */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-900">
                  ข้อมูลรายงาน
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                <InfoItem
                  icon={<Activity size={16} />}
                  label="สถานะ"
                  value={
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  }
                />

                <InfoItem
                  icon={<User size={16} />}
                  label="ผู้รายงาน"
                  value={report.reporter_name || "-"}
                />

                <InfoItem
                  icon={<MapPin size={16} />}
                  label="ละติจูด"
                  value={report.latitude ?? "-"}
                />

                <InfoItem
                  icon={<MapPin size={16} />}
                  label="ลองจิจูด"
                  value={report.longitude ?? "-"}
                />

                <InfoItem
                  icon={<Calendar size={16} />}
                  label="วันที่รายงาน"
                  value={
                    report.created_at
                      ? new Date(report.created_at).toLocaleString("th-TH")
                      : "-"
                  }
                />

                <InfoItem
                  icon={<Calendar size={16} />}
                  label="อัปเดตล่าสุด"
                  value={
                    report.updated_at
                      ? new Date(report.updated_at).toLocaleString("th-TH")
                      : "-"
                  }
                />

              </div>
            </section>

            {/* Description */}
            <section>
              <h3 className="mb-3 font-bold text-slate-900">
                คำอธิบาย
              </h3>

              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                {report.description || "ไม่มีคำอธิบายเพิ่มเติม"}
              </div>
            </section>

            {/* AI Analysis */}
            {ai && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Brain size={18} className="text-purple-600" />

                  <h3 className="font-bold text-slate-900">
                    ผลวิเคราะห์ AI
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                  <AnalysisItem
                    label="จำนวนจุดเสียหาย"
                    value={ai.cv_defect_count}
                  />

                  <AnalysisItem
                    label="อัตราความเสียหาย"
                    value={`${ai.cv_damage_ratio_percent}%`}
                  />

                  <AnalysisItem
                    label="Severity สูงสุด"
                    value={ai.cv_max_severity_score}
                  />

                  <AnalysisItem
                    label="Fusion Score"
                    value={ai.final_fusion_score}
                  />

                  <AnalysisItem
                    label="AI Decision"
                    value={
                      decisionMap[ai.final_decision] ||
                      ai.final_decision ||
                      "-"
                    }
                  />

                  <AnalysisItem
                    label="Model Version"
                    value={ai.model_version}
                  />

                </div>
              </section>
            )}

            {/* Road Information */}
            {ai && (
              <section>
                <h3 className="mb-3 font-bold text-slate-900">
                  ข้อมูลถนน
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                  <InfoItem
                    label="ชื่อถนน"
                    value={ai.road_name || "-"}
                  />

                  <InfoItem
                    label="ประเภทถนน"
                    value={ai.road_type || "-"}
                  />

                  <InfoItem
                    label="จำนวนเลน"
                    value={ai.lanes ?? "-"}
                  />

                  <InfoItem
                    label="จำกัดความเร็ว"
                    value={
                      ai.speed_limit
                        ? `${ai.speed_limit} km/h`
                        : "-"
                    }
                  />

                </div>
              </section>
            )}

            {/* Environmental */}
            {ai && (
              <section>
                <h3 className="mb-3 font-bold text-slate-900">
                  ข้อมูลสิ่งแวดล้อม
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                  <AnalysisItem
                    label="Rainfall 12 เดือน"
                    value={`${ai.rainfall_last_12m_mm ?? 0} mm`}
                  />

                  <AnalysisItem
                    label="Soil Moisture"
                    value={`${ai.soil_moisture_last_30d_mm ?? 0}`}
                  />

                  <AnalysisItem
                    label="NDVI"
                    value={ai.ndvi_index ?? 0}
                  />

                  <AnalysisItem
                    label="Slope"
                    value={`${ai.slope ?? 0}°`}
                  />

                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  );
}


/* =========================
   Components
========================= */

function InfoItem({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        {icon}
        <span>{label}</span>
      </div>

      <div className="mt-1 text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}


function AnalysisItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-900">
        {value ?? "-"}
      </p>
    </div>
  );
}