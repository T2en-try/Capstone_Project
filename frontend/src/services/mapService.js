import { BASE_URL } from "./api";
import axios from "axios";


const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ========================================
// GET Map Points
// ========================================
export const fetchMapPoints = async (includeRejected = false) => {
  try {
    const response = await api.get("/api/reports/map/points", {
      params: {
        include_rejected: includeRejected,
      },
    });

    return response.data;
  } catch (error) {
    console.error("fetchMapPoints error:", error);

    throw new Error(
      error.response?.data?.detail ||
        `ไม่สามารถโหลดข้อมูลแผนที่ได้ (${error.response?.status || "Network Error"})`
    );
  }
};

// ========================================
// GET Report Detail
// ========================================
export const fetchMapReportDetail = async (reportId) => {
  try {
    const response = await api.get(`/api/reports/${reportId}`);

    return response.data;
  } catch (error) {
    console.error("fetchMapReportDetail error:", error);

    throw new Error(
      error.response?.data?.detail ||
        `ไม่สามารถโหลดรายละเอียดรายงาน #${reportId} ได้`
    );
  }
};

// ========================================
// UPDATE Report Location
// ========================================
export const updateReportLocation = async (
  reportId,
  latitude,
  longitude
) => {
  try {
    const response = await api.patch(
      `/api/reports/${reportId}/location`,
      {
        latitude,
        longitude,
      }
    );

    return response.data;
  } catch (error) {
    console.error("updateReportLocation error:", error);

    throw new Error(
      error.response?.data?.detail ||
        "ไม่สามารถแก้ไขตำแหน่งรายงานได้"
    );
  }
};

// ========================================
// UPDATE Report Status
// ========================================
export const updateReportStatus = async (reportId, status) => {
  try {
    const response = await api.patch(
      `/api/reports/${reportId}/status`,
      {
        status,
      }
    );

    return response.data;
  } catch (error) {
    console.error("updateReportStatus error:", error);

    throw new Error(
      error.response?.data?.detail ||
        "ไม่สามารถเปลี่ยนสถานะรายงานได้"
    );
  }
};