import { BASE_URL } from './api';

/**
 * Analytics Service - CASP Grid Priority
 * เรียก GET /api/analytics/grid-priority
 */
export const API_ANALYTICS = `${BASE_URL}/api/analytics`;

/**
 * ดึงข้อมูล Grid Priority จาก Backend
 * @param {number} days - ช่วงเวลาย้อนหลัง (default 7)
 * @returns {Promise<GridPriorityResponse>}
 */
export async function fetchGridPriority(days = 7) {
  const res = await fetch(`${API_ANALYTICS}/grid-priority?days=${days}`);
  if (!res.ok) throw new Error(`Failed to fetch grid priority: ${res.status}`);
  return res.json();
}
