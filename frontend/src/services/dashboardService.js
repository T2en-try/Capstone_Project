import { API_REPORTS, BASE_URL } from "./api";

/**
 * =========================================================
 * User Dashboard Service
 * =========================================================
 *
 * Service สำหรับเชื่อม User Dashboard
 * กับ FastAPI Backend
 *
 * User ไม่จำเป็นต้อง Login
 */


/**
 * =========================================================
 * 1. Dashboard Statistics
 * =========================================================
 *
 * GET
 * /api/reports/stats/summary
 */
export const fetchDashboardStats = async () => {
  try {
    const response = await fetch(
      `${API_REPORTS}/stats/summary`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `ไม่สามารถโหลดสถิติได้ (${response.status})`
      );
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        total_reports: data.total_reports ?? 0,
        pending_count: data.pending_count ?? 0,
        processing_count: data.processing_count ?? 0,
        completed_count: data.completed_count ?? 0,
        rejected_count: data.rejected_count ?? 0,
      },
    };
  } catch (error) {
    console.error(
      "❌ fetchDashboardStats:",
      error
    );

    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};


/**
 * =========================================================
 * 2. Map Points
 * =========================================================
 *
 * GET
 * /api/reports/map/points
 */
export const fetchMapPoints = async (
  includeRejected = false
) => {
  try {
    const params = new URLSearchParams({
      include_rejected: String(includeRejected),
    });

    const response = await fetch(
      `${API_REPORTS}/map/points?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `ไม่สามารถโหลดข้อมูลแผนที่ได้ (${response.status})`
      );
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        total: data.total ?? 0,
        points: Array.isArray(data.points)
          ? data.points
          : [],
      },
    };
  } catch (error) {
    console.error(
      "❌ fetchMapPoints:",
      error
    );

    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};


/**
 * =========================================================
 * 3. Reports List
 * =========================================================
 *
 * GET
 * /api/reports/
 */
export const fetchReports = async (
  page = 1,
  perPage = 20,
  status = null
) => {
  try {
    const params = new URLSearchParams();

    params.append("page", String(page));
    params.append("per_page", String(perPage));

    if (status) {
      params.append("status", status);
    }

    const response = await fetch(
      `${API_REPORTS}/?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `ไม่สามารถโหลดรายการรายงานได้ (${response.status})`
      );
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        total: data.total ?? 0,
        page: data.page ?? page,
        per_page: data.per_page ?? perPage,
        reports: Array.isArray(data.reports)
          ? data.reports
          : [],
      },
    };
  } catch (error) {
    console.error(
      "❌ fetchReports:",
      error
    );

    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};


/**
 * =========================================================
 * 4. Latest Reports
 * =========================================================
 *
 * ใช้สำหรับ NewsSection
 *
 * GET
 * /api/reports/?page=1&per_page=4
 */
export const fetchLatestReports = async (
  limit = 4
) => {
  return fetchReports(1, limit);
};


/**
 * =========================================================
 * 4.1 Dashboard Search / Filter
 * =========================================================
 *
 * กรองจุดบนแผนที่ตามคำค้นและสถานะ
 * - สถานะ: กรอง client-side จาก map points
 * - คำค้น: ดึงรายการรายงานเพิ่มเพื่อค้นใน description / ชื่อถนน
 */
const getReportRoadName = (report) =>
  report?.road_name ||
  report?.ai_analysis?.road_name ||
  report?.ai_result?.context_data?.gis?.road_name ||
  "";

export const normalizeStatus = (status) =>
  String(status || "").toLowerCase();

export const matchesReportKeyword = (report, keyword) => {
  const kw = String(keyword || "").trim().toLowerCase();
  if (!kw) {
    return true;
  }

  return (
    String(report.id).includes(kw) ||
    (report.description || "").toLowerCase().includes(kw) ||
    (report.reporter_name || "").toLowerCase().includes(kw) ||
    getReportRoadName(report).toLowerCase().includes(kw)
  );
};

export const matchesPointKeyword = (point, keyword) => {
  const kw = String(keyword || "").trim().toLowerCase();
  if (!kw) {
    return true;
  }

  return (
    String(point.id).includes(kw) ||
    (point.road_name || "").toLowerCase().includes(kw) ||
    (point.reporter_name || "").toLowerCase().includes(kw)
  );
};

export const applyDashboardFilters = (
  allMapPoints = [],
  allReports = [],
  { keyword = "", status = "all" } = {}
) => {
  const normalizedKeyword = String(keyword || "").trim().toLowerCase();
  const normalizedStatus = normalizeStatus(status);
  const hasKeyword = normalizedKeyword.length > 0;
  const hasStatus = normalizedStatus !== "all";

  if (!hasKeyword && !hasStatus) {
    return {
      points: allMapPoints,
      reports: allReports,
      matchedCount: allMapPoints.length,
      reportCount: allReports.length,
    };
  }

  const matchedReports = allReports.filter((report) => {
    if (hasStatus && normalizeStatus(report.status) !== normalizedStatus) {
      return false;
    }
    return matchesReportKeyword(report, normalizedKeyword);
  });

  const matchedReportIds = new Set(
    matchedReports.map((report) => report.id)
  );

  const points = allMapPoints.filter((point) => {
    if (hasStatus && normalizeStatus(point.status) !== normalizedStatus) {
      return false;
    }

    if (!hasKeyword) {
      return true;
    }

    return (
      matchedReportIds.has(point.id) ||
      matchesPointKeyword(point, normalizedKeyword)
    );
  });

  return {
    points,
    reports: matchedReports,
    matchedCount: points.length,
    reportCount: matchedReports.length,
  };
};

/**
 * =========================================================
 * 5. Report Detail
 * =========================================================
 *
 * GET
 * /api/reports/{reportId}
 */
export const fetchReportById = async (
  reportId
) => {
  try {
    if (!reportId) {
      throw new Error("ไม่พบ Report ID");
    }

    const response = await fetch(
      `${API_REPORTS}/${reportId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          "ไม่พบรายงานที่ต้องการ"
        );
      }

      throw new Error(
        `ไม่สามารถโหลดรายงานได้ (${response.status})`
      );
    }

    const data = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error(
      `❌ fetchReportById(${reportId}):`,
      error
    );

    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};


/**
 * =========================================================
 * 6. Report Image URL
 * =========================================================
 *
 * แปลงชื่อไฟล์รูปจาก Backend
 * ให้เป็น URL สำหรับ <img src="">
 *
 * ตัวอย่าง:
 *
 * image_filename:
 * road_123.jpg
 *
 * จะกลายเป็น:
 *
 * http://127.0.0.1:8000/uploads/road_123.jpg
 */
export const getReportImageUrl = (report) => {
  if (!report) {
    return null;
  }

  const imageValue =
    report.image_filename ||
    report.image_url ||
    report.image_path ||
    report.image ||
    report.filename ||
    report.file_path;

  if (!imageValue) {
    return null;
  }

  const value = String(imageValue).trim();

  if (!value) {
    return null;
  }

  // URL เต็ม
  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  // /uploads/xxx.jpg
  if (value.startsWith("/uploads/")) {
    return `${BASE_URL}${value}`;
  }

  // uploads/xxx.jpg
  if (value.startsWith("uploads/")) {
    return `${BASE_URL}/${value}`;
  }

  // ชื่อไฟล์อย่างเดียว
  return `${BASE_URL}/uploads/${value}`;
};


/**
 * =========================================================
 * 7. Upload Road Report
 * =========================================================
 *
 * POST
 * /api/reports/upload
 */
export const uploadRoadReport = async ({
  image,
  description = "",
  reporterName = "",
  latitude = null,
  longitude = null,
}) => {
  try {
    if (!image) {
      throw new Error("กรุณาเลือกรูปภาพ");
    }

    const formData = new FormData();

    formData.append(
      "image",
      image
    );

    if (description) {
      formData.append(
        "description",
        description
      );
    }

    if (reporterName) {
      formData.append(
        "reporter_name",
        reporterName
      );
    }

    if (latitude !== null) {
      formData.append(
        "latitude",
        String(latitude)
      );
    }

    if (longitude !== null) {
      formData.append(
        "longitude",
        String(longitude)
      );
    }

    const response = await fetch(
      `${API_REPORTS}/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      let errorMessage =
        `Upload failed (${response.status})`;

      try {
        const errorData =
          await response.json();

        errorMessage =
          errorData.message ||
          errorData.detail ||
          errorMessage;
      } catch {
        // ignore
      }

      throw new Error(
        errorMessage
      );
    }

    const data =
      await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error(
      "❌ uploadRoadReport:",
      error
    );

    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};


/**
 * =========================================================
 * Export
 * =========================================================
 */

export default {
  fetchDashboardStats,
  fetchMapPoints,
  fetchReports,
  fetchLatestReports,
  fetchReportById,
  getReportImageUrl,
  uploadRoadReport,
  applyDashboardFilters,
  matchesReportKeyword,
  matchesPointKeyword,
};