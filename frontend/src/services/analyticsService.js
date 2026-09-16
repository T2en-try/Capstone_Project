import { BASE_URL } from './api';

/**
 * Analytics Service - CASP Grid Priority
 * เรียก GET /api/analytics/grid-priority
 */
export const API_ANALYTICS = `${BASE_URL}/api/analytics`;

/**
 * ดึงข้อมูล Grid Priority จาก Backend (รองรับ DSS Weights)
 * @param {number} days - ช่วงเวลาย้อนหลัง (default 7)
 * @param {Object} [weights] - ค่าน้ำหนัก DSS ({ w_ppi, w_cus, w_c, w_d, w_r, w_n })
 * @returns {Promise<GridPriorityResponse>}
 */
export async function fetchGridPriority(days = 7, weights = {}) {
  const params = new URLSearchParams({ days: String(days) });
  if (weights && typeof weights === "object") {
    Object.entries(weights).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        params.append(key, String(val));
      }
    });
  }
  const res = await fetch(`${API_ANALYTICS}/grid-priority?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch grid priority: ${res.status}`);
  return res.json();
}

/**
 * ดึง Priority ที่รวมตาม OSM Way ID ด้วย Max Severity
 * @param {number} days - ช่วงเวลาย้อนหลัง (default 30)
 */
export async function fetchRoadSegmentPriority(days = 30) {
  const res = await fetch(`${API_ANALYTICS}/road-segment-priority?days=${days}`);
  if (!res.ok) throw new Error(`Failed to fetch road segment priority: ${res.status}`);
  return res.json();
}
