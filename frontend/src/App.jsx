import React from "react";
import { Routes, Route } from "react-router-dom";

import UserDashboard from "./pages/UserDashboard";
import UserReport from "./pages/UserReportPage";

import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPriority from "./pages/AdminPriority";
import AdminReportDetail from "./pages/AdminReportDetail";

import AdminLoginPage from "./pages/AdminLoginPage";
import ProtectedRoute from "./components/ProtectedRoute";

// Leaflet
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function App() {
  return (
    <Routes>
      {/* User */}
      <Route path="/" element={<UserDashboard />} />
      <Route path="/report" element={<UserReport />} />

      {/* Admin Login */}
      <Route path="/login" element={<AdminLoginPage />} />

      {/* Admin Layout (Protected) */}
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="priority-reports" element={<AdminPriority />} />
        <Route path="reports/:id" element={<AdminReportDetail />} />

      </Route>
    </Routes>
  );
}

export default App;