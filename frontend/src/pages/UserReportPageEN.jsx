import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import imageCompression from "browser-image-compression";
import "leaflet/dist/leaflet.css";

import {
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

import StatusBadge from "../components/ui/StatusBadge";

import GpsPinModal from "../features/reports/GpsPinModal";
import AiResultModal from "../features/reports/AiResultModal";
import ReportDetailModal from "../features/reports/ReportDetailModal";

import MainLayout from "../layouts/MainLayout";
import Sidebar from "../layouts/Sidebaren";
import Navbar from "../layouts/NavbarEN";
import MobileBottomNav from "../layouts/MobileBottomNav";

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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  const [aiResult, setAiResult] = useState(null);
  const [processingMessage, setProcessingMessage] = useState("");

  const pollingRef = useRef(null);

  // ============================================================
  // GPS / Snap-to-Road
  // ============================================================

  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const pendingFormRef = useRef(null);

  // Mobile Form Modal
  const [showMobileForm, setShowMobileForm] = useState(false);

  // Mobile Filter
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Image processing
  const [imageProcessing, setImageProcessing] = useState(false);

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
        axios.get(`${API_REPORTS}/?per_page=20`),
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
          ? `Report submitted. The system is analyzing image #${reportId}...`
          : "Report submitted successfully. Processing is in progress..."
      );

      setFormData({
        description: "",
        reporter_name: "",
      });

      await fetchData();

      if (reportId) {
        pollReportResult(reportId);
      } else {
        const isMobile = window.innerWidth < 768;

        Swal.fire({
          title: "Success!",
          text: "Report submitted successfully.",
          icon: "success",
          confirmButtonColor: "#2D7A5F",
          ...(isMobile && {
            toast: true,
            position: "bottom",
            timer: 3000,
            showConfirmButton: false,
          }),
        });
      }
    } catch (err) {
      Swal.fire({
        title: "An error occurred",
        text:
          err.response?.data?.detail ||
          "Unable to contact the server. Please try again.",
        icon: "error",
        confirmButtonColor: "#C45C4A",
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Poll AI Result
  // ============================================================

  const pollReportResult = async (
    reportId,
    attempt = 0
  ) => {
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
          `Analysis for report #${reportId} is complete.`
        );

        setAiResult(
          report.ai_result || null
        );

        await fetchData();

        if (!report.ai_result) {
          Swal.fire({
            title: "Success!",
            text:
              "Report submitted successfully, but no AI result is available for this report.",
            icon: "info",
            confirmButtonColor: "#2F6F7E",
          });
        }

        return;
      }

      // ------------------------------
      // Rejected
      // ------------------------------

      if (report.status === "rejected") {
        setProcessingMessage(
          `Report #${reportId} did not pass verification.`
        );

        Swal.fire({
          title: "Report Rejected",
          text:
            report.rejection_reason === "not_a_road"
              ? "The submitted image does not appear to show a road, so the report was rejected."
              : "The system was unable to analyze this report.",
          icon: "warning",
          confirmButtonColor: "#C4891A",
        });

        await fetchData();

        return;
      }

      // ------------------------------
      // Timeout
      // ------------------------------

      if (attempt >= maxAttempts) {
        setProcessingMessage(
          "Processing is still in progress. You can check the status in the report list."
        );

        await fetchData();

        return;
      }

      // ------------------------------
      // Processing Message
      // ------------------------------

      setProcessingMessage(
        report.status === "processing"
          ? `Analyzing report #${reportId}...`
          : `Waiting for report #${reportId} to be processed...`
      );

      pollingRef.current = setTimeout(() => {
        pollReportResult(
          reportId,
          attempt + 1
        );
      }, 2000);
    } catch {
      if (attempt >= maxAttempts) {
        setProcessingMessage(
          "Unable to check the AI analysis result. Please open the report details later."
        );

        return;
      }

      pollingRef.current = setTimeout(() => {
        pollReportResult(
          reportId,
          attempt + 1
        );
      }, 2000);
    }
  };

  // ============================================================
  // File Upload
  // ============================================================

  const handleFileChange = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    // ----------------------------------------------------------
    // Image Processing
    // ----------------------------------------------------------

    setImageProcessing(true);
    setLoading(true);

    let compressedFile = file;

    try {
      compressedFile = await imageCompression(
        file,
        {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          preserveExif: true,
        }
      );
    } catch (err) {
      console.error(
        "Image compression failed, falling back to original:",
        err
      );
    }

    setImageProcessing(false);

    // ----------------------------------------------------------
    // Prepare FormData
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // Close mobile form
    // ----------------------------------------------------------

    setShowMobileForm(false);

    // ----------------------------------------------------------
    // IMPORTANT:
    // Every image must go through the GPS Pin Modal.
    // ----------------------------------------------------------

    setLoading(false);

    setPendingFile(compressedFile);

    pendingFormRef.current = base;

    setShowPinModal(true);

    // Allow selecting the same file again
    e.target.value = "";
  };

  // ============================================================
  // GPS Pin Confirm
  // ============================================================

  const handlePinConfirm = async (
    lat,
    lon
  ) => {
    setShowPinModal(false);

    const fd = pendingFormRef.current;

    if (!fd) return;

    // ----------------------------------------------------------
    // IMPORTANT:
    // Use set() instead of append()
    // to prevent duplicate latitude / longitude values.
    // ----------------------------------------------------------

    fd.set(
      "latitude",
      String(lat)
    );

    fd.set(
      "longitude",
      String(lon)
    );

    // Submit report after Snap-to-Road
    await submitReport(fd);

    // Clear pending data
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
      Swal.fire({
        title: "Error!",
        text: "Report data could not be found.",
        icon: "error",
        confirmButtonColor: "#C45C4A",
      });
    }
  };

  // ============================================================
  // Update Status
  // ============================================================

  const updateStatus = async (
    id,
    newStatus
  ) => {
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
      Swal.fire({
        title: "Error!",
        text: "Failed to update report status.",
        icon: "error",
        confirmButtonColor: "#C45C4A",
      });
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
      Swal.fire({
        title: "Error!",
        text: "Failed to update report coordinates.",
        icon: "error",
        confirmButtonColor: "#C45C4A",
      });
    }
  };

  // ============================================================
  // Filter Reports
  // ============================================================

  const filteredReports = reports.filter(
    (r) => {
      const matchesStatus =
        filterStatus === "all" ||
        r.status === filterStatus;

      const q = searchQuery
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
        String(r.id || "").includes(q);

      return (
        matchesStatus &&
        matchesSearch
      );
    }
  );

  // ============================================================
  // Status Summary
  // ============================================================

  const statusItems = [
    {
      label: "Total Reports",
      value:
        stats?.total_reports ?? 0,
      icon: <ClipboardList size={17} />,
      accent: "text-ink",
    },
    {
      label: "Pending",
      value:
        stats?.pending_count ?? 0,
      icon: <Clock size={17} />,
      accent: "text-mark-deep",
    },
    {
      label: "In Progress",
      value:
        stats?.processing_count ?? 0,
      icon: <LoaderCircle size={17} />,
      accent: "text-info",
    },
    {
      label: "Completed",
      value:
        stats?.completed_count ?? 0,
      icon: <CheckCircle2 size={17} />,
      accent: "text-ok",
    },
  ];

  // ============================================================
  // Pagination
  // ============================================================

  const totalPages = Math.ceil(
    filteredReports.length / PAGE_SIZE
  );

  const paginatedReports =
    filteredReports.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    );

  // ============================================================
  // Render
  // ============================================================

  return (
    <MainLayout>
      <Navbar />

      {/* ========================================================
          IMAGE PROCESSING OVERLAY
      ======================================================== */}

      {imageProcessing && (
        <div className="image-processing-overlay">
          <div className="spinner" />

          <p className="text-paper text-sm font-semibold">
            Preparing image...
          </p>

          <p className="text-paper/60 text-xs">
            Please wait a moment.
          </p>
        </div>
      )}

      {/* ========================================================
          PAGE HEADER
      ======================================================== */}

      <header className="border-b border-line bg-paper">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] uppercase text-mark-deep">
                  <span className="w-1.5 h-1.5 rounded-full bg-mark" />
                  ROAD-PREDICT AI
                </span>
              </div>

              <h1 className="font-display text-xl sm:text-3xl text-ink leading-tight">
                Report a Road Issue
              </h1>

              <p className="mt-1 text-xs sm:text-sm text-asphalt/60">
                Report road issues with photos — AI will automatically analyze the submitted image.
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

      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-3 pb-28 sm:pb-20 lg:pb-6 lg:py-6">
        <div className="flex flex-col xl:flex-row gap-4 sm:gap-6">

          {/* ====================================================
              LEFT — REPORT FORM
          ==================================================== */}

          <aside className="hidden xl:block w-full xl:w-[340px] xl:shrink-0">
            <div className="xl:sticky xl:top-20">

              <Sidebar
                formData={formData}
                setFormData={setFormData}
                handleFileChange={handleFileChange}
                loading={loading}
              />

              <div className="mt-3 px-1">
                <p className="text-[11px] leading-relaxed text-asphalt/45">
                  The system automatically verifies the image and analyzes the priority level of the reported road issue.
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
                <div className="flex sm:grid sm:grid-cols-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar">

                  {statusItems.map(
                    (item, index) => (
                      <div
                        key={item.label}
                        className={`
                          min-w-[45%] sm:min-w-0 shrink-0 snap-center
                          px-3 sm:px-5 py-3 sm:py-4
                          ${
                            index !== 0
                              ? "border-l border-line"
                              : ""
                          }
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
                            text-xl sm:text-2xl
                            ${item.accent}
                          `}
                        >
                          {item.value}
                        </div>
                      </div>
                    )
                  )}
                </div>

                <style>
                  {`
                    .hide-scrollbar::-webkit-scrollbar {
                      display: none;
                    }

                    .hide-scrollbar {
                      -ms-overflow-style: none;
                      scrollbar-width: none;
                    }
                  `}
                </style>
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
                      Processing
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

            <section className="mt-4 sm:mt-6">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 sm:gap-4">

                <div>
                  <div className="flex items-center gap-2">

                    <h2 className="font-display text-lg sm:text-xl text-ink">
                      Report List
                    </h2>

                    <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-mist text-xs font-bold text-ink-soft">
                      {filteredReports.length}
                    </span>

                  </div>

                  <p className="text-xs sm:text-sm text-asphalt/55 mt-0.5 sm:mt-1">
                    Track the status and details of submitted road reports.
                  </p>
                </div>

                {/* ==================================================
                    DESKTOP FILTER
                ================================================== */}

                <div className="hidden sm:flex flex-col sm:flex-row gap-2 w-full lg:w-auto">

                  <label className="relative sm:w-64">

                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-asphalt/40 pointer-events-none"
                    />

                    <input
                      type="text"
                      placeholder="Search reports..."
                      value={searchQuery}
                      onChange={(e) =>
                        setSearchQuery(
                          e.target.value
                        )
                      }
                      className="w-full pl-9 pr-3 py-2.5 bg-paper border border-line rounded-xl text-sm text-ink placeholder:text-asphalt/40 outline-none transition focus:border-ink-soft focus:ring-2 focus:ring-ink/10"
                    />

                  </label>

                  <div className="relative">

                    <Filter
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-asphalt/40 pointer-events-none"
                    />

                    <select
                      value={filterStatus}
                      onChange={(e) =>
                        setFilterStatus(
                          e.target.value
                        )
                      }
                      className="appearance-none w-full sm:w-44 pl-9 pr-8 py-2.5 bg-paper border border-line rounded-xl text-sm font-medium text-ink outline-none cursor-pointer focus:border-ink-soft focus:ring-2 focus:ring-ink/10"
                    >
                      <option value="all">
                        All Statuses
                      </option>

                      <option value="pending">
                        Pending
                      </option>

                      <option value="processing">
                        In Progress
                      </option>

                      <option value="completed">
                        Completed
                      </option>

                      <option value="rejected">
                        Rejected
                      </option>
                    </select>

                  </div>
                </div>

                {/* ==================================================
                    MOBILE SEARCH + FILTER
                ================================================== */}

                <div className="flex sm:hidden gap-2">

                  <label className="relative flex-1">

                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-asphalt/40 pointer-events-none"
                    />

                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) =>
                        setSearchQuery(
                          e.target.value
                        )
                      }
                      className="w-full pl-9 pr-3 py-2.5 bg-paper border border-line rounded-xl text-sm text-ink placeholder:text-asphalt/40 outline-none transition focus:border-ink-soft"
                    />

                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setShowMobileFilter(
                        !showMobileFilter
                      )
                    }
                    className={`
                      flex items-center justify-center
                      w-11 h-11 rounded-xl border
                      transition-all
                      ${
                        filterStatus !== "all"
                          ? "border-mark bg-mark/10 text-mark-deep"
                          : "border-line bg-paper text-asphalt/50"
                      }
                    `}
                  >
                    <Filter size={18} />
                  </button>

                </div>

                {/* ==================================================
                    MOBILE FILTER SHEET
                ================================================== */}

                {showMobileFilter && (
                  <div className="sm:hidden bg-paper border border-line rounded-xl p-3 space-y-2">

                    <p className="text-xs font-semibold text-ink">
                      Filter by Status
                    </p>

                    <div className="flex flex-wrap gap-2">

                      {[
                        {
                          value: "all",
                          label: "All",
                        },
                        {
                          value: "pending",
                          label: "Pending",
                        },
                        {
                          value: "processing",
                          label: "In Progress",
                        },
                        {
                          value: "completed",
                          label: "Completed",
                        },
                        {
                          value: "rejected",
                          label: "Rejected",
                        },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setFilterStatus(
                              opt.value
                            );

                            setShowMobileFilter(
                              false
                            );
                          }}
                          className={`
                            px-3 py-2 rounded-lg
                            text-xs font-semibold
                            transition-all
                            ${
                              filterStatus ===
                              opt.value
                                ? "bg-ink text-paper"
                                : "bg-mist text-ink-soft active:bg-ink/10"
                            }
                          `}
                        >
                          {opt.label}
                        </button>
                      ))}

                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ==================================================
                REPORT LIST
            ================================================== */}

            <section className="mt-3 sm:mt-4">

              <div className="border-y border-line divide-y divide-line bg-paper/70">

                {paginatedReports.length > 0 ? (

                  paginatedReports.map(
                    (r) => (
                      <article
                        key={r.id}
                        className="
                          group
                          px-3 sm:px-5
                          py-3 sm:py-5
                          active:bg-mist/60
                          transition-colors
                          cursor-pointer
                        "
                        onClick={() =>
                          viewDetail(r.id)
                        }
                      >

                        <div className="flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4">

                          <div className="flex-1 min-w-0">

                            <div className="flex flex-wrap items-center gap-2 mb-1">

                              <span className="font-mono text-[11px] font-bold text-asphalt/45">
                                #{r.id}
                              </span>

                              <StatusBadge
                                status={r.status}
                              />

                            </div>

                            <h3 className="font-semibold text-sm sm:text-base text-ink truncate">
                              {r.reporter_name ||
                                "Anonymous Reporter"}
                            </h3>

                            <p className="mt-0.5 text-xs sm:text-sm text-asphalt/65 line-clamp-2 leading-relaxed">
                              {r.description ||
                                "No additional details provided."}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-asphalt/50">

                              <span className="inline-flex items-center gap-1">

                                <Clock size={12} />

                                {r.created_at
                                  ? new Date(
                                      r.created_at
                                    ).toLocaleString(
                                      "en-US",
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

                                  No coordinates

                                </span>

                              )}

                            </div>
                          </div>

                          {/* Actions */}

                          <div className="flex items-center justify-end gap-2 shrink-0">

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                viewDetail(r.id);
                              }}
                              className="
                                hidden sm:inline-flex
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
                                active:scale-[0.98]
                                transition
                              "
                            >
                              <Eye size={15} />

                              <span>
                                View Details
                              </span>
                            </button>

                          </div>
                        </div>
                      </article>
                    )
                  )

                ) : (

                  /* ==================================================
                     EMPTY STATE
                  ================================================== */

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
                        ? "No reports match your criteria"
                        : "No reports yet"}

                    </h3>

                    <p className="mt-1 text-sm text-asphalt/55">

                      {searchQuery ||
                      filterStatus !== "all"
                        ? "Try changing your search or filter criteria."
                        : "Submitted road issue reports will appear here."}

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
                        Clear Filters
                      </button>

                    )}

                  </div>
                )}

              </div>

              {/* ==================================================
                  PAGINATION
              ================================================== */}

              {totalPages > 1 && (

                <div className="p-3 sm:p-4 flex items-center justify-center gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage(
                        (p) =>
                          Math.max(
                            1,
                            p - 1
                          )
                      )
                    }
                    disabled={
                      currentPage === 1
                    }
                    className="
                      px-3 py-2
                      rounded-lg
                      text-sm
                      font-semibold
                      border border-line
                      bg-white
                      text-ink-soft
                      disabled:opacity-40
                      disabled:cursor-not-allowed
                      active:scale-[0.98]
                      transition-all
                    "
                  >
                    ← Previous
                  </button>

                  <span className="text-xs text-asphalt/60 tabular-nums">
                    Page {currentPage} /{" "}
                    {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage(
                        (p) =>
                          Math.min(
                            totalPages,
                            p + 1
                          )
                      )
                    }
                    disabled={
                      currentPage ===
                      totalPages
                    }
                    className="
                      px-3 py-2
                      rounded-lg
                      text-sm
                      font-semibold
                      border border-line
                      bg-white
                      text-ink-soft
                      disabled:opacity-40
                      disabled:cursor-not-allowed
                      active:scale-[0.98]
                      transition-all
                    "
                  >
                    Next →
                  </button>

                </div>
              )}

            </section>

            {filteredReports.length > 0 && (

              <div className="flex items-center justify-between mt-2 px-1">

                <span className="text-[11px] text-asphalt/40">
                  Showing{" "}
                  {paginatedReports.length}{" "}
                  of{" "}
                  {filteredReports.length}{" "}
                  reports
                </span>

                <span className="text-[11px] text-asphalt/40">
                  Road Monitor
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
        onUpdateStatus={
          updateStatus
        }
        onConfirmLocation={
          confirmLocation
        }
      />

      {/* ========================================================
          MOBILE FAB
      ======================================================== */}

      <button
        type="button"
        onClick={() =>
          setShowMobileForm(true)
        }
        className="
          xl:hidden
          fixed
          bottom-20
          right-4
          z-40
          w-14
          h-14
          rounded-full
          bg-ink
          text-paper
          shadow-lg
          flex
          items-center
          justify-center
          active:scale-95
          transition-transform
        "
        style={{
          marginBottom:
            "env(safe-area-inset-bottom, 0px)",
        }}
        aria-label="Report a road issue"
      >
        <FilePlus2 size={24} />
      </button>

      {/* ========================================================
          MOBILE FORM MODAL
      ======================================================== */}

      {showMobileForm && (
        <div className="
          xl:hidden
          fixed
          inset-0
          bg-ink/55
          backdrop-blur-sm
          z-[60]
          flex
          items-end
          justify-center
        ">

          <div
            className="
              bg-paper
              w-full
              max-h-[85vh]
              rounded-t-2xl
              overflow-y-auto
            "
            style={{
              paddingBottom:
                "env(safe-area-inset-bottom, 16px)",
            }}
          >

            <div className="
              flex
              items-center
              justify-between
              p-4
              border-b
              border-line
              sticky
              top-0
              bg-paper
              z-10
            ">

              <h3 className="font-display text-lg text-ink">
                Report a Road Issue
              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowMobileForm(false)
                }
                className="
                  w-9
                  h-9
                  flex
                  items-center
                  justify-center
                  rounded-full
                  bg-mist
                  text-asphalt/60
                  active:bg-danger
                  active:text-paper
                  transition-colors
                "
              >
                <span className="text-lg">
                  ✕
                </span>
              </button>

            </div>

            <div className="p-4">

              <Sidebar
                formData={formData}
                setFormData={setFormData}
                handleFileChange={
                  handleFileChange
                }
                loading={loading}
              />

            </div>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </MainLayout>
  );
}