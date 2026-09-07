export const PRIORITY_LABELS = {
  1: "Good (สภาพปกติ)",
  2: "Warning (ควรเฝ้าระวัง)",
  3: "Critical (ต้องซ่อมแซมด่วน)",
};

export const PRIORITY_SEVERITY = {
  1: "Low",
  2: "High",
  3: "Critical",
};

export const normalizePriorityClass = (value) => {
  const number = Number(value);
  return [1, 2, 3].includes(number) ? number : null;
};

export const getPriorityLabel = (value) =>
  PRIORITY_LABELS[normalizePriorityClass(value)] || "ยังไม่มีผลวิเคราะห์";

export const getSeverityLabel = (value) =>
  PRIORITY_SEVERITY[normalizePriorityClass(value)] || "Unknown";

export const getConfidencePercent = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(Math.max(0, Math.min(1, number)) * 100) : null;
}; 

export const getProbabilityPercent = (value) => {
  const percent = getConfidencePercent(value);
  return percent === null ? null : percent;
};