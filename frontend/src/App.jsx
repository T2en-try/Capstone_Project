import React from 'react';
import  UserDashboard  from "./pages/UserDashboard";
import { Routes, Route } from 'react-router-dom';
import UserReport from './pages/UserReportPage';

// --- Fix Leaflet default marker icon ---
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function App() {
  return (
    <Routes>
      {/* หน้าฝั่งประชาชน: แจ้งซ่อม */}
      <Route path="/" element={<UserDashboard />} />
      <Route path="/report" element={<UserReport />} />

      {/* หน้าฝั่งวิศวกร/เจ้าหน้าที่: Dashboard & Heatmap */}
      {/* <Route path="/admin/dashboard" element={<AdminDashboard />} /> */}

    </Routes>
  )
}

export default App