import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import imageCompression from "browser-image-compression";
import "leaflet/dist/leaflet.css";

import {
  Trash2,
  Info,
  Clock,
  MapPin,
  Search,
  Filter,
  Eye,
  FilePlus2,
  CheckCircle2,
  LoaderCircle,
  ClipboardList,
} from "lucide-react";

import { API_REPORTS } from "../services/api";
import { readExifGpsClient } from "../utils/exifGps";

import StatCard from "../components/ui/StatCard";
import StatusBadge from "../components/ui/StatusBadge";

import GpsPinModal from "../features/reports/GpsPinModal";
import AiResultModal from "../features/reports/AiResultModal";
import ReportDetailModal from "../features/reports/ReportDetailModal";

import MainLayout from "../layouts/MainLayout";
import Sidebar from "../layouts/Sidebar";
import Navbar from "../layouts/Navbar";

export default function UserReportPage() {
  // ============================================================
  // State
  // ============================================================

  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);

  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [aiResult, setAiResult] = useState(null);
  const [processingMessage, setProcessingMessage] = useState("");

  const pollingRef = useRef(null);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const pendingFormRef = useRef(null);

  const [formData, setFormData] = useState({
    description: "",
    reporter_name: "",
  });

  // ============================================================
  // Initial Load
  // ============================================================

  useEffect(() => {
    fetchData();

    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, []);

  // ============================================================
  // Fetch Reports
  // ============================================================

  const fetchData = async () => {
    try {
      const [resList, resStats] = await Promise.all([
        axios.get(`${API_REPORTS}/?per_page=100`),
        axios.get(`${API_REPORTS}/stats/summary`),
      ]);

      setReports(resList.data.reports || []);
      setStats(resStats.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  // ============================================================
  // Submit Report
  // ============================================================

  const submitReport = async (formPayload) => {
    setLoading(true);

    try {
      const res = await axios.post(
        `${API_REPORTS}/upload`,
        formPayload
      );

      const reportId = res.data.report?.id;

      setProcessingMessage(
        reportId
          ? `ส่งรายงานแล้ว ระบบกำลังวิเคราะห์ภาพ #${reportId}...`
          : "ส่งรายงานสำเร็จแล้ว ระบบกำลังประมวลผล..."
      );

      setFormData({
        description: "",
        reporter_name: "",
      });

      await fetchData();

      if (reportId) {
        pollReportResult(reportId);
      } else {
        alert("ส่งรายงานสำเร็จแล้ว");
      }
    } catch (err) {
      alert(
        err.response?.data?.detail ||
          "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Poll AI Result
  // ============================================================

  const pollReportResult = async (reportId, attempt = 0) => {
    const maxAttempts = 30;

    try {
      const detail = await axios.get(
        `${API_REPORTS}/${reportId}`
      );

      const report = detail.data;

      // ------------------------------
      // Completed
      // ------------------------------

      if (report.status === "completed") {
        setProcessingMessage(
          `วิเคราะห์รายงาน #${reportId} เสร็จแล้ว`
        );

        setAiResult(report.ai_result || null);

        await fetchData();

        if (!report.ai_result) {
          alert(
            "ส่งรายงานสำเร็จแล้ว แต่ยังไม่มีผล AI สำหรับรายงานนี้"
          );
        }

        return;
      }

      // ------------------------------
      // Rejected
      // ------------------------------

      if (report.status === "rejected") {
        setProcessingMessage(
          `รายงาน #${reportId} ไม่ผ่านการตรวจสอบ`
        );

        alert(
          report.rejection_reason === "not_a_road"
            ? "ภาพที่ส่งไม่ใช่ภาพถนน ระบบจึงปฏิเสธรายงาน"
            : "ระบบไม่สามารถวิเคราะห์รายงานนี้ได้"
        );

        await fetchData();

        return;
      }

      // ------------------------------
      // Timeout
      // ------------------------------

      if (attempt >= maxAttempts) {
        setProcessingMessage(
          "ระบบยังประมวลผลไม่เสร็จ สามารถดูสถานะได้จากรายการรายงาน"
        );

        await fetchData();

        return;
      }

      // ------------------------------
      // Processing Message
      // ------------------------------

      setProcessingMessage(
        report.status === "processing"
          ? `กำลังวิเคราะห์รายงาน #${reportId}...`
          : `กำลังรอระบบรับรายงาน #${reportId}...`
      );

      pollingRef.current = setTimeout(() => {
        pollReportResult(reportId, attempt + 1);
      }, 2000);
    } catch {
      if (attempt >= maxAttempts) {
        setProcessingMessage(
          "ไม่สามารถตรวจสอบผล AI ได้ กรุณาเปิดรายละเอียดรายงานภายหลัง"
        );

        return;
      }

      pollingRef.current = setTimeout(() => {
        pollReportResult(reportId, attempt + 1);
      }, 2000);
    }
  };

  // ============================================================
  // File Upload
  // ============================================================

  const handleFileChange = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setLoading(true);

    const hasGps = await readExifGpsClient(file);

    let compressedFile = file;

    try {
      compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        preserveExif: true,
      });
    } catch (err) {
      console.error(
        "Image compression failed, falling back to original:",
        err
      );
    }

    const base = new FormData();

    base.append(
      "image",
      new File(
        [compressedFile],
        file.name,
        {
          type:
            compressedFile.type ||
            file.type,
        }
      )
    );

    base.append(
      "description",
      formData.description
    );

    base.append(
      "reporter_name",
      formData.reporter_name
    );

    // มี GPS จาก EXIF
    if (hasGps) {
      await submitReport(base);
    }

    // ไม่มี GPS → ให้ผู้ใช้ปักหมุด
    else {
      setLoading(false);

      setPendingFile(compressedFile);

      pendingFormRef.current = base;

      setShowPinModal(true);
    }

    e.target.value = "";
  };

  // ============================================================
  // GPS Pin Confirm
  // ============================================================

  const handlePinConfirm = async (lat, lon) => {
    setShowPinModal(false);

    const fd = pendingFormRef.current;

    if (!fd) return;

    fd.append("latitude", lat);
    fd.append("longitude", lon);

    await submitReport(fd);

    setPendingFile(null);
    pendingFormRef.current = null;
  };

  // ============================================================
  // GPS Pin Cancel
  // ============================================================

  const handlePinCancel = () => {
    setShowPinModal(false);

    setPendingFile(null);

    pendingFormRef.current = null;
  };

  // ============================================================
  // View Detail
  // ============================================================

  const viewDetail = async (id) => {
    try {
      const res = await axios.get(
        `${API_REPORTS}/${id}`
      );

      setSelectedReport(res.data);
      setIsModalOpen(true);
    } catch {
      alert("ไม่พบข้อมูลรายงาน");
    }
  };

  // ============================================================
  // Update Status
  // ============================================================

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.patch(
        `${API_REPORTS}/${id}/status`,
        {
          status: newStatus,
        }
      );

      await fetchData();

      if (selectedReport) {
        setSelectedReport((prev) => ({
          ...prev,
          status: newStatus,
        }));
      }
    } catch {
      alert("อัปเดตสถานะไม่สำเร็จ");
    }
  };

  // ============================================================
  // Confirm Location
  // ============================================================

  const confirmLocation = async (
    id,
    lat,
    lon
  ) => {
    try {
      const res = await axios.patch(
        `${API_REPORTS}/${id}/location`,
        {
          latitude: lat,
          longitude: lon,
        }
      );

      setSelectedReport(res.data);

      await fetchData();
    } catch {
      alert("อัปเดตพิกัดไม่สำเร็จ");
    }
  };

  // ============================================================
  // Delete Report
  // ============================================================

  const deleteReport = async (id) => {
    if (
      !window.confirm(
        "ต้องการลบรายงานนี้หรือไม่?"
      )
    ) {
      return;
    }

    try {
      await axios.delete(
        `${API_REPORTS}/${id}`
      );

      setIsModalOpen(false);

      await fetchData();
    } catch {
      alert("ลบไม่สำเร็จ");
    }
  };

  // ============================================================
  // Filter Reports
  // ============================================================

  const filteredReports = reports.filter((r) => {
    const matchesStatus =
      filterStatus === "all" ||
      r.status === filterStatus;

    const q =
      searchQuery
        .trim()
        .toLowerCase();

    const matchesSearch =
      !q ||
      (r.reporter_name || "")
        .toLowerCase()
        .includes(q) ||
      (r.description || "")
        .toLowerCase()
        .includes(q) ||
      String(r.id || "")
        .includes(q);

    return (
      matchesStatus &&
      matchesSearch
    );
  });

  // ============================================================
  // Status Summary
  // ============================================================

  const statusItems = [
    {
      label: "รายงานทั้งหมด",
      value: stats?.total_reports ?? 0,
      icon: <ClipboardList size={17} />,
      accent: "text-ink",
    },
    {
      label: "รอรับเรื่อง",
      value: stats?.pending_count ?? 0,
      icon: <Clock size={17} />,
      accent: "text-mark-deep",
    },
    {
      label: "กำลังดำเนินการ",
      value: stats?.processing_count ?? 0,
      icon: <LoaderCircle size={17} />,
      accent: "text-info",
    },
    {
      label: "เสร็จสิ้น",
      value: stats?.completed_count ?? 0,
      icon: <CheckCircle2 size={17} />,
      accent: "text-ok",
    },
  ];

  // ============================================================
  // Render
  // ============================================================

  return (
    <MainLayout>
      <Navbar />

      {/* ========================================================
          PAGE HEADER
      ======================================================== */}

      <header className="border-b border-line bg-paper">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] uppercase text-mark-deep">
                  <span className="w-1.5 h-1.5 rounded-full bg-mark" />
                  ROAD-PREDICT AI
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl text-ink leading-tight">
                แจ้งปัญหาถนน
              </h1>

              <p className="mt-1.5 text-sm text-asphalt/60">
                แจ้งปัญหาถนนพร้อมภาพถ่าย
                ระบบจะช่วยวิเคราะห์สภาพถนนด้วย AI
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-asphalt/50">
              <MapPin size={14} />
              <span>
                Road Monitor
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================
          MAIN CONTENT
      ======================================================== */}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-6">
        <div className="flex flex-col xl:flex-row gap-6">
          
          {/* ====================================================
              LEFT — REPORT FORM
          ==================================================== */}

          <aside className="w-full xl:w-[340px] xl:shrink-0">
            <div className="xl:sticky xl:top-20">
              <Sidebar
                formData={formData}
                setFormData={setFormData}
                handleFileChange={handleFileChange}
                loading={loading}
              />

              {/* Small information note */}

              <div className="mt-3 px-1">
                <p className="text-[11px] leading-relaxed text-asphalt/45">
                  ระบบจะตรวจสอบภาพและวิเคราะห์ระดับความเร่งด่วน
                  ของปัญหาถนนโดยอัตโนมัติ
                </p>
              </div>
            </div>
          </aside>

          {/* ====================================================
              RIGHT — REPORT LIST
          ==================================================== */}

          <main className="flex-1 min-w-0">
            
            {/* ==================================================
                SUMMARY STRIP
            ================================================== */}

            {stats && (
              <section className="border-y border-line bg-paper">
                <div className="grid grid-cols-2 lg:grid-cols-4">
                  {statusItems.map(
                    (item, index) => (
                      <div
                        key={item.label}
                        className={`
                          px-4 sm:px-5 py-4
                          ${index !== 0 ? "border-l border-line" : ""}
                        `}
                      >
                        <div className="flex items-center gap-2 text-asphalt/50">
                          <span className={item.accent}>
                            {item.icon}
                          </span>

                          <span className="text-xs">
                            {item.label}
                          </span>
                        </div>

                        <div
                          className={`
                            mt-1
                            font-display
                            text-2xl
                            ${item.accent}
                          `}
                        >
                          {item.value}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

            {/* ==================================================
                PROCESSING MESSAGE
            ================================================== */}

            {processingMessage && (
              <section className="mt-4">
                <div className="flex items-start gap-3 rounded-xl border border-mark/30 bg-mark/10 px-4 py-3">
                  <LoaderCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-mark-deep animate-spin"
                  />

                  <div>
                    <p className="text-sm font-semibold text-ink">
                      กำลังประมวลผล
                    </p>

                    <p className="text-xs text-asphalt/60 mt-0.5">
                      {processingMessage}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* ==================================================
                LIST HEADER
            ================================================== */}

            <section className="mt-6">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl text-ink">
                      รายการแจ้งซ่อม
                    </h2>

                    <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-mist text-xs font-bold text-ink-soft">
                      {filteredReports.length}
                    </span>
                  </div>

                  <p className="text-sm text-asphalt/55 mt-1">
                    ติดตามสถานะและรายละเอียดของรายงานที่แจ้งเข้ามา
                  </p>
                </div>

                {/* ==================================================
                    SEARCH + FILTER
                ================================================== */}

                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  <label className="relative sm:w-64">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-asphalt/40 pointer-events-none"
                    />

                    <input
                      type="text"
                      placeholder="ค้นหารายงาน..."
                      value={searchQuery}
                      onChange={(e) =>
                        setSearchQuery(
                          e.target.value
                        )
                      }
                      className="
                        w-full
                        pl-9 pr-3
                        py-2.5
                        bg-paper
                        border border-line
                        rounded-xl
                        text-sm
                        text-ink
                        placeholder:text-asphalt/40
                        outline-none
                        transition
                        focus:border-ink-soft
                        focus:ring-2
                        focus:ring-ink/10
                      "
                    />
                  </label>

                  <div className="relative">
                    <Filter
                      size={15}
                      className="
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                        text-asphalt/40
                        pointer-events-none
                      "
                    />

                    <select
                      value={filterStatus}
                      onChange={(e) =>
                        setFilterStatus(
                          e.target.value
                        )
                      }
                      className="
                        appearance-none
                        w-full
                        sm:w-44
                        pl-9 pr-8
                        py-2.5
                        bg-paper
                        border border-line
                        rounded-xl
                        text-sm
                        font-medium
                        text-ink
                        outline-none
                        cursor-pointer
                        focus:border-ink-soft
                        focus:ring-2
                        focus:ring-ink/10
                      "
                    >
                      <option value="all">
                        ทุกสถานะ
                      </option>

                      <option value="pending">
                        รอรับเรื่อง
                      </option>

                      <option value="processing">
                        กำลังดำเนินการ
                      </option>

                      <option value="completed">
                        เสร็จสิ้น
                      </option>

                      <option value="rejected">
                        ไม่ผ่านการตรวจ
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* ==================================================
                REPORT LIST
            ================================================== */}

            <section className="mt-4">
              <div className="border-y border-line divide-y divide-line bg-paper/70">
                
                {filteredReports.length > 0 ? (
                  filteredReports.map(
                    (r) => (
                      <article
                        key={r.id}
                        className="
                          group
                          px-3 sm:px-5
                          py-4 sm:py-5
                          hover:bg-mist/60
                          transition-colors
                        "
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          
                          {/* ----------------------------------
                              Report Main Info
                          ---------------------------------- */}

                          <div className="flex-1 min-w-0">
                            
                            {/* ID + status */}

                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span className="font-mono text-[11px] font-bold text-asphalt/45">
                                #{r.id}
                              </span>

                              <StatusBadge
                                status={r.status}
                              />
                            </div>

                            {/* Reporter */}

                            <h3 className="font-semibold text-ink truncate">
                              {r.reporter_name ||
                                "ไม่ระบุชื่อผู้แจ้ง"}
                            </h3>

                            {/* Description */}

                            <p className="mt-1 text-sm text-asphalt/65 line-clamp-2 leading-relaxed">
                              {r.description ||
                                "ไม่มีรายละเอียดเพิ่มเติม"}
                            </p>

                            {/* Metadata */}

                            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-asphalt/50">
                              
                              <span className="inline-flex items-center gap-1">
                                <Clock size={12} />

                                {r.created_at
                                  ? new Date(
                                      r.created_at
                                    ).toLocaleString(
                                      "th-TH",
                                      {
                                        dateStyle:
                                          "medium",
                                        timeStyle:
                                          "short",
                                      }
                                    )
                                  : "-"}
                              </span>

                              {r.latitude != null &&
                              r.longitude != null ? (
                                <span className="inline-flex items-center gap-1 font-mono">
                                  <MapPin
                                    size={12}
                                    className="text-danger"
                                  />

                                  {Number(
                                    r.latitude
                                  ).toFixed(5)}
                                  ,{" "}
                                  {Number(
                                    r.longitude
                                  ).toFixed(5)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin size={12} />
                                  ไม่มีพิกัด
                                </span>
                              )}
                            </div>
                          </div>

                          {/* ----------------------------------
                              Actions
                          ---------------------------------- */}

                          <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0">
                            
                            <button
                              type="button"
                              onClick={() =>
                                viewDetail(
                                  r.id
                                )
                              }
                              className="
                                inline-flex
                                items-center
                                justify-center
                                gap-1.5
                                px-4
                                py-2.5
                                rounded-xl
                                bg-ink
                                text-paper
                                text-sm
                                font-semibold
                                hover:bg-ink-soft
                                active:scale-[0.98]
                                transition
                              "
                            >
                              <Eye size={15} />

                              <span>
                                ดูรายละเอียด
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteReport(
                                  r.id
                                )
                              }
                              className="
                                inline-flex
                                items-center
                                justify-center
                                w-10
                                h-10
                                rounded-xl
                                text-asphalt/40
                                hover:text-danger
                                hover:bg-danger/10
                                transition
                              "
                              title="ลบรายงาน"
                            >
                              <Trash2
                                size={16}
                              />
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  )
                ) : (
                  
                  /* ============================================
                     EMPTY STATE
                  ============================================ */

                  <div className="py-16 px-6 text-center">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-mist flex items-center justify-center">
                      <FilePlus2
                        size={22}
                        className="text-ink-soft/50"
                      />
                    </div>

                    <h3 className="mt-4 font-display text-lg text-ink">
                      {searchQuery ||
                      filterStatus !== "all"
                        ? "ไม่พบรายงานที่ตรงกับเงื่อนไข"
                        : "ยังไม่มีรายการแจ้งซ่อม"}
                    </h3>

                    <p className="mt-1 text-sm text-asphalt/55">
                      {searchQuery ||
                      filterStatus !== "all"
                        ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง"
                        : "เมื่อมีการแจ้งปัญหาถนน รายการจะแสดงที่นี่"}
                    </p>

                    {(searchQuery ||
                      filterStatus !== "all") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setFilterStatus(
                            "all"
                          );
                        }}
                        className="
                          mt-4
                          text-sm
                          font-semibold
                          text-ink-soft
                          hover:text-ink
                          underline
                          underline-offset-4
                        "
                      >
                        ล้างตัวกรอง
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* ==================================================
                FOOTER INFORMATION
            ================================================== */}

            {filteredReports.length > 0 && (
              <div className="flex items-center justify-between mt-3 px-1">
                <span className="text-[11px] text-asphalt/40">
                  แสดง {filteredReports.length} รายการ
                </span>

                <span className="text-[11px] text-asphalt/40">
                  Road Monitor · Smart Road Monitoring System
                </span>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ========================================================
          GPS PIN MODAL
      ======================================================== */}

      {showPinModal && (
        <GpsPinModal
          pendingFile={pendingFile}
          onConfirm={handlePinConfirm}
          onCancel={handlePinCancel}
        />
      )}

      {/* ========================================================
          AI RESULT MODAL
      ======================================================== */}

      <AiResultModal
        aiResult={aiResult}
        onClose={() =>
          setAiResult(null)
        }
      />

      {/* ========================================================
          REPORT DETAIL MODAL
      ======================================================== */}

      <ReportDetailModal
        isOpen={isModalOpen}
        report={selectedReport}
        onClose={() =>
          setIsModalOpen(false)
        }
        onUpdateStatus={updateStatus}
        onConfirmLocation={
          confirmLocation
        }
      />
    </MainLayout>
  );
}