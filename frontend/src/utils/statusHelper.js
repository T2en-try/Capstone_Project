/**
 * Helper utilities for deriving report status and actions from road_actions (report_actions)
 */

/**
 * ดึงสถานะปัจจุบันของรายงานจากตารางประวัติ actions (road_actions / report_actions)
 * เรียงตาม action_timestamp ล่าสุดเสมอ
 *
 * @param {Object} report
 * @returns {string} สถานะปัจจุบัน เช่น 'pending', 'processing', 'completed', 'rejected'
 */
export const getReportStatus = (report) => {
  if (!report) return "pending";

  // 1. ตรวจสอบ latest_action จาก Backend ก่อน (ถ้ามี)
  if (report.latest_action && report.latest_action.new_status) {
    return String(report.latest_action.new_status).toLowerCase();
  }

  // 2. ตรวจสอบลิสต์ actions ใน report
  if (Array.isArray(report.actions) && report.actions.length > 0) {
    const sorted = [...report.actions].sort((a, b) => {
      const timeA = new Date(a.action_timestamp || 0).getTime();
      const timeB = new Date(b.action_timestamp || 0).getTime();
      return timeB - timeA;
    });
    if (sorted[0]?.new_status) {
      return String(sorted[0].new_status).toLowerCase();
    }
  }

  // 3. Fallback สำหรับความเข้ากันได้ย้อนหลัง
  const fallback = report.priority_status || report.status || "pending";
  return String(fallback).toLowerCase();
};

/**
 * ดึงข้อมูล Action ล่าสุด
 * @param {Object} report
 * @returns {Object|null}
 */
export const getLatestAction = (report) => {
  if (!report) return null;
  if (report.latest_action) return report.latest_action;
  if (Array.isArray(report.actions) && report.actions.length > 0) {
    const sorted = [...report.actions].sort((a, b) => {
      const timeA = new Date(a.action_timestamp || 0).getTime();
      const timeB = new Date(b.action_timestamp || 0).getTime();
      return timeB - timeA;
    });
    return sorted[0];
  }
  return null;
};

/**
 * ดึงสี Tag ของสถานะ
 * @param {string} status
 * @returns {string}
 */
export const getStatusColor = (status) => {
  const s = String(status || "").toLowerCase();
  switch (s) {
    case "pending":
      return "gold";
    case "processing":
      return "blue";
    case "completed":
      return "green";
    case "rejected":
      return "red";
    default:
      return "default";
  }
};

/**
 * จัดรูปแบบวันที่และเวลาสำหรับ Action
 * @param {string|Date} dateVal
 * @returns {string}
 */
export const formatActionDate = (dateVal) => {
  if (!dateVal) return "-";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};
