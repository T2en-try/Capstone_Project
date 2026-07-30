import React from "react";
import { Routes, Route } from "react-router-dom";

import UserDashboard from "./pages/UserDashboard";
import UserReport from "./pages/UserReportPage";

import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPriority from "./pages/AdminPriority";

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

      {/* Admin Layout */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="priority-reports" element={<AdminPriority />} />

      </Route>
    </Routes>
  );
}

export default App;