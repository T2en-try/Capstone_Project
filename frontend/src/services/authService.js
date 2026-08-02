/**
 * Auth Service — จัดการการยืนยันตัวตน Admin
 * เรียก API /api/auth/login, /api/auth/me
 * เก็บ token ใน localStorage
 */

import { BASE_URL } from "./api";

const TOKEN_KEY = "admin_token";
const ADMIN_KEY = "admin_info";

/**
 * Login — เรียก API เพื่อเข้าสู่ระบบ
 */
export async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || "เข้าสู่ระบบไม่สำเร็จ");
  }

  // เก็บ token และข้อมูล admin ลง localStorage
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(ADMIN_KEY, JSON.stringify(data.admin));

  return data;
}

/**
 * Get Me — ดึงข้อมูล Admin จาก Token
 */
export async function getMe() {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      logout();
      return null;
    }

    const data = await res.json();
    localStorage.setItem(ADMIN_KEY, JSON.stringify(data.admin));
    return data.admin;
  } catch {
    return null;
  }
}

/**
 * Logout — ลบ token ออกจาก localStorage
 */
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

/**
 * Get Token — ดึง JWT token จาก localStorage
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get Admin Info — ดึงข้อมูล admin จาก localStorage
 */
export function getAdminInfo() {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Is Authenticated — ตรวจสอบว่า Login อยู่หรือไม่
 */
export function isAuthenticated() {
  return !!getToken();
}
