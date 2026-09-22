import React from "react";
import { Routes, Route } from "react-router-dom";

import UserDashboard from "./pages/UserDashboard";
import UserDashboardEN from "./pages/UserDashboardEN";
import UserReport from "./pages/UserReportPage";
import UserReportEN from "./pages/UserReportPageEN";

import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPriority from "./pages/AdminPriority";
import AdminReportDetail from "./pages/AdminReportDetail";
import AdminGISMap from "./pages/AdminGISMap";
import AdminGISMapEN from "./pages/AdminGISMapEN";
import AdminDataValidation from "./pages/AdminDataValidation";
import AdminDataValidationEN from "./pages/AdminDataValidationEN";
import AdminEmployees from "./pages/AdminEmployees";

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
        <Route path="/en" element={<UserDashboardEN />} />
      <Route path="/report" element={<UserReport />} />
      <Route path="/report/en" element={<UserReportEN />} />

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
        <Route path="map" element={<AdminGISMap />} />
        <Route path="map/en" element={<AdminGISMapEN />} />
        <Route path="ai" element={<AdminDataValidation />} />
        <Route path="ai/en" element={<AdminDataValidationEN />} />
        <Route path="employees" element={<AdminEmployees />} />

      </Route>
    </Routes>
  );
}

export default App;