import React, { useState, useEffect, useRef, useCallback } from "react";

import Navbar from "../layouts/Navbar";

import NewsSection from "../components/user-dashboard/NewSection";
import MapView from "../components/user-dashboard/Mapview";
import StatusCard from "../components/user-dashboard/StatusCard";
import SearchBar from "../components/user-dashboard/SearchBar";
import SearchResults from "../components/user-dashboard/SearchResults";
import ReportDetailModal from "../components/user-dashboard/ReportDetailModal";

import {
  fetchDashboardStats,
  fetchMapPoints,
  fetchReports,
  fetchReportById,
  applyDashboardFilters,
} from "../services/dashboardService";


export default function UserDashboard() {

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

  useEffect(() => {

    const loadDashboardData = async () => {

      try {

        setLoading(true);
        setError(null);

        const [statsResult, reportsResult, pointsResult] = await Promise.all([
          fetchDashboardStats(),
          fetchReports(1, 100),
          fetchMapPoints(true),
        ]);

        if (statsResult.success) {
          setStats(statsResult.data);
        } else {
          console.warn(
            "⚠️ ไม่สามารถดึงข้อมูลสถิติได้:",
            statsResult.error
          );
        }

        const reports = reportsResult.success
          ? reportsResult.data.reports
          : [];
        const points = pointsResult.success
          ? pointsResult.data.points
          : [];

        if (!reportsResult.success) {
          console.warn(
            "⚠️ ไม่สามารถดึงรายการรายงานได้:",
            reportsResult.error
          );
        }

        if (!pointsResult.success) {
          console.warn(
            "⚠️ ไม่สามารถดึงข้อมูลแผนที่ได้:",
            pointsResult.error
          );
        }

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
          "❌ Error loading dashboard data:",
          err
        );

        setError(err.message);

      } finally {

        setLoading(false);

      }

    };


    loadDashboardData();

  }, []);


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
          "ไม่สามารถโหลดรายละเอียดรายงานได้"
        );
      }

    } catch (err) {

      console.error(
        "❌ Error fetching report detail:",
        err
      );

      setDetailError(
        err.message ||
        "เกิดข้อผิดพลาดในการโหลดข้อมูล"
      );

    } finally {

      setDetailLoading(false);

    }

  };


  const handleSearch = useCallback((filters) => {
    applyFilters(filters);
  }, [applyFilters]);


  const handleCloseReportDetail = () => {
    setSelectedReport(null);
    setDetailError(null);
  };


  return (

    <div className="min-h-screen app-atmosphere flex flex-col">

      <Navbar />

      <main className="flex-1 p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto w-full">

        <div className="bg-paper border border-line p-6 rounded-2xl shadow-sm">
          <NewsSection onReportClick={handleMarkerClick} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            ⚠️ เกิดข้อผิดพลาด: {error}
          </div>
        )}

        <SearchBar
          onSearch={handleSearch}
          disabled={loading}
          resultMeta={searchMeta}
        />

        <SearchResults
          reports={searchResults}
          active={searchMeta.active}
          onSelect={handleMarkerClick}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          <div className="lg:col-span-8 bg-paper rounded-2xl shadow-sm border border-line overflow-hidden h-[450px] lg:h-[600px] w-full">
            <MapView
              mapPoints={mapPoints}
              loading={loading}
              onMarkerClick={handleMarkerClick}
              isFiltered={searchMeta.active}
            />
          </div>

          <div className="lg:col-span-4 bg-paper rounded-2xl shadow-sm border border-line p-5 min-h-[450px] lg:h-[600px] flex flex-col justify-between">
            <StatusCard
              stats={stats}
              loading={loading}
            />
            <div className="text-center p-6 text-asphalt/55 my-auto" />
          </div>

        </div>

      </main>

      <ReportDetailModal
        report={selectedReport}
        loading={detailLoading}
        error={detailError}
        onClose={handleCloseReportDetail}
      />

    </div>

  );

}
