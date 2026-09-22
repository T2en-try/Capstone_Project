import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";

import Navbar from "../layouts/NavbarEN";
import MobileBottomNav from "../layouts/MobileBottomNav";

import NewsSection from "../components/user-dashboard/NewsSectionEN";
import MapView from "../components/user-dashboard/MapviewEN";
import StatusCard from "../components/user-dashboard/StatusCardEN";
import SearchBar from "../components/user-dashboard/SearchBarEN";
import SearchResults from "../components/user-dashboard/SearchResults";
import ReportDetailModal from "../components/user-dashboard/ReportDetailModal";

import {
  fetchDashboardStats,
  fetchMapPoints,
  fetchReports,
  fetchReportById,
  applyDashboardFilters,
} from "../services/dashboardService";

export default function UserDashboardEN() {
  // =========================================================
  // State
  // =========================================================

  const [stats, setStats] = useState({
    total_reports: 0,
    pending_count: 0,
    processing_count: 0,
    completed_count: 0,
    rejected_count: 0,
  });

  const [mapPoints, setMapPoints] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  const allMapPointsRef = useRef([]);
  const allReportsRef = useRef([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchMeta, setSearchMeta] = useState({
    matched: 0,
    total: 0,
    reportCount: 0,
    active: false,
  });

  const [selectedReport, setSelectedReport] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // =========================================================
  // Apply Dashboard Filters
  // =========================================================

  const applyFilters = useCallback((filters) => {
    const result = applyDashboardFilters(
      allMapPointsRef.current,
      allReportsRef.current,
      filters
    );

    setMapPoints(result.points);
    setSearchResults(result.reports);

    setSearchMeta({
      matched: result.matchedCount,
      total: allMapPointsRef.current.length,
      reportCount: result.reportCount,
      active:
        filters.keyword.trim() !== "" ||
        filters.status !== "all",
    });
  }, []);

  // =========================================================
  // Load Dashboard Data
  // =========================================================

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          statsResult,
          reportsResult,
          pointsResult,
        ] = await Promise.all([
          fetchDashboardStats(),
          fetchReports(1, 100),
          fetchMapPoints(true),
        ]);

        // =====================================================
        // Statistics
        // =====================================================

        if (statsResult.success) {
          setStats(statsResult.data);
        } else {
          console.warn(
            "Unable to load dashboard statistics:",
            statsResult.error
          );
        }

        // =====================================================
        // Reports
        // =====================================================

        const reports = reportsResult.success
          ? reportsResult.data.reports || []
          : [];

        // =====================================================
        // Map Points
        // =====================================================

        const points = pointsResult.success
          ? pointsResult.data.points || []
          : [];

        if (!reportsResult.success) {
          console.warn(
            "Unable to load reports:",
            reportsResult.error
          );
        }

        if (!pointsResult.success) {
          console.warn(
            "Unable to load map data:",
            pointsResult.error
          );
        }

        // =====================================================
        // Store Data
        // =====================================================

        allReportsRef.current = reports;
        allMapPointsRef.current = points;

        setMapPoints(points);
        setSearchResults([]);

        setSearchMeta({
          matched: points.length,
          total: points.length,
          reportCount: reports.length,
          active: false,
        });
      } catch (err) {
        console.error(
          "Error loading dashboard data:",
          err
        );

        setError(
          err?.message ||
            "An error occurred while loading dashboard data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // =========================================================
  // Marker / Report Detail
  // =========================================================

  const handleMarkerClick = async (reportId) => {
    try {
      setDetailLoading(true);
      setDetailError(null);

      const result = await fetchReportById(reportId);

      if (result.success) {
        setSelectedReport(result.data);
      } else {
        setDetailError(
          result.error ||
            "Unable to load report details."
        );
      }
    } catch (err) {
      console.error(
        "Error fetching report detail:",
        err
      );

      setDetailError(
        err?.message ||
          "An error occurred while loading report details."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  // =========================================================
  // Search
  // =========================================================

  const handleSearch = useCallback(
    (filters) => {
      applyFilters(filters);
    },
    [applyFilters]
  );

  // =========================================================
  // Close Report Detail
  // =========================================================

  const handleCloseReportDetail = () => {
    setSelectedReport(null);
    setDetailError(null);
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen app-atmosphere flex flex-col">

      {/* =====================================================
          Navbar
      ===================================================== */}

      <Navbar />

      {/* =====================================================
          Main Content
      ===================================================== */}

      <main
        className="
          flex-1
          w-full
          max-w-[1600px]
          mx-auto

          p-4
          pb-20

          md:p-6

          space-y-6
        "
      >

        {/* ===================================================
            Latest Road Reports
        =================================================== */}

        <section
          className="
            w-full
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm

            md:p-6
          "
        >
          <NewsSection
            onReportClick={handleMarkerClick}
          />
        </section>

        {/* ===================================================
            Dashboard Error
        =================================================== */}

        {error && (
          <div
            className="
              flex
              items-start
              gap-3

              rounded-xl
              border
              border-red-200
              bg-red-50

              px-4
              py-3

              text-red-700
            "
          >
            <span className="mt-0.5 shrink-0">
              ⚠️
            </span>

            <div className="min-w-0">
              <p className="text-sm font-semibold">
                Unable to load dashboard
              </p>

              <p className="mt-0.5 text-xs text-red-600">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* ===================================================
            Search
        =================================================== */}

        <SearchBar
          onSearch={handleSearch}
          disabled={loading}
          resultMeta={searchMeta}
        />

        {/* ===================================================
            Search Results
        =================================================== */}

        <SearchResults
          reports={searchResults}
          active={searchMeta.active}
          onSelect={handleMarkerClick}
        />

        {/* ===================================================
            Map + Statistics
        =================================================== */}

        <div
          className="
            grid
            grid-cols-1
            items-start
            gap-6

            lg:grid-cols-12
          "
        >

          {/* =================================================
              Map
          ================================================= */}

          <section
            className="
              w-full
              overflow-hidden

              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-sm

              lg:col-span-8

              h-[340px]
              sm:h-[420px]
              lg:h-[600px]
            "
          >
            <MapView
              mapPoints={mapPoints}
              loading={loading}
              onMarkerClick={handleMarkerClick}
              isFiltered={searchMeta.active}
            />
          </section>

          {/* =================================================
              Statistics
          ================================================= */}

          <section
            className="
              w-full

              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-sm

              p-5

              lg:col-span-4

              min-h-0
              sm:min-h-[450px]
              lg:h-[600px]
            "
          >
            <StatusCard
              stats={stats}
              loading={loading}
            />
          </section>
        </div>
      </main>

      {/* =====================================================
          Report Detail Modal
      ===================================================== */}

      <ReportDetailModal
        report={selectedReport}
        loading={detailLoading}
        error={detailError}
        onClose={handleCloseReportDetail}
      />

      {/* =====================================================
          Mobile Bottom Navigation
      ===================================================== */}

      <MobileBottomNav />
    </div>
  );
}