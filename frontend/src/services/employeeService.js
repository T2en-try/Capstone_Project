import { BASE_URL } from "./api";
import { getToken } from "./authService";

const endpoint = `${BASE_URL}/api/employees`;

async function request(path = "", options = {}) {
  const response = await fetch(`${endpoint}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `เกิดข้อผิดพลาด (${response.status})`);
  }

  return response.status === 204 ? null : response.json();
}

export const fetchEmployees = () => request();

export const createEmployee = (employee) => request("", {
  method: "POST",
  body: JSON.stringify(employee),
});

export const updateEmployee = (id, employee) => request(`/${id}`, {
  method: "PATCH",
  body: JSON.stringify(employee),
});

export const deleteEmployee = (id) => request(`/${id}`, { method: "DELETE" });