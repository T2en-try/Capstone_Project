import { BASE_URL } from "./api";

const TOKEN_KEY = "admin_token";
const ADMIN_KEY = "admin_info";

export async function login(email, password) {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await res.json();

    // ==========================
    // API Error
    // ==========================

    if (!res.ok) {
      let errorMessage = "เข้าสู่ระบบไม่สำเร็จ";

      if (typeof data.detail === "string") {
        errorMessage = data.detail;
      } else if (Array.isArray(data.detail)) {
        errorMessage = data.detail
          .map((item) => {
            if (typeof item === "string") {
              return item;
            }

            return (
              item.msg ||
              item.message ||
              JSON.stringify(item)
            );
          })
          .join(", ");
      } else if (data.detail && typeof data.detail === "object") {
        errorMessage =
          data.detail.message ||
          data.detail.msg ||
          JSON.stringify(data.detail);
      } else if (data.message) {
        errorMessage =
          typeof data.message === "string"
            ? data.message
            : JSON.stringify(data.message);
      }

      throw new Error(errorMessage);
    }

    // ==========================
    // Save Login Data
    // ==========================

    if (!data.access_token) {
      throw new Error(
        "ไม่พบ Access Token จาก Server"
      );
    }

    localStorage.setItem(
      TOKEN_KEY,
      data.access_token
    );

    if (data.admin) {
      localStorage.setItem(
        ADMIN_KEY,
        JSON.stringify(data.admin)
      );
    }

    return data;

  } catch (error) {

    console.error(
      "Login Error:",
      error
    );

    // Error จากเรา
    if (error instanceof Error) {
      throw error;
    }

    // ป้องกัน [object Object]
    if (
      error &&
      typeof error === "object"
    ) {
      throw new Error(
        error.message ||
        error.detail ||
        JSON.stringify(error)
      );
    }

    throw new Error(
      String(error) ||
      "เข้าสู่ระบบไม่สำเร็จ"
    );
  }
}

export async function getMe() {
  const token = getToken();

  if (!token) {
    return null;
  }

  try {
    const res = await fetch(
      `${BASE_URL}/api/auth/me`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      logout();
      return null;
    }

    if (data.admin) {
      localStorage.setItem(
        ADMIN_KEY,
        JSON.stringify(data.admin)
      );
    }

    return data.admin;

  } catch (error) {
    console.error(
      "getMe Error:",
      error
    );

    return null;
  }
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdminInfo() {
  try {
    const raw =
      localStorage.getItem(ADMIN_KEY);

    return raw
      ? JSON.parse(raw)
      : null;

  } catch (error) {
    console.error(
      "getAdminInfo Error:",
      error
    );

    return null;
  }
}

export function isAuthenticated() {
  return !!getToken();
}