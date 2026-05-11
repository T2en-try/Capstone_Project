import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  LayoutDashboard, Trash2, Info, X,
  CheckCircle, Clock, AlertCircle, User, MapPin, Search, Filter, BrainCircuit, FileDigit, Navigation, LocateFixed
} from 'lucide-react';
import { BASE_URL, API_REPORTS } from '../services/api';
import { readExifGpsClient } from '../utils/exifGps';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import DetailItem from '../components/ui/DetailItem';
import GpsPinModal from '../features/reports/GpsPinModal';
import AiResultModal from '../features/reports/AiResultModal';
import ReportDetailModal from '../features/reports/ReportDetailModal';
import MainLayout from '../layouts/MainLayout';
import Sidebar from '../layouts/Sidebar';

// ─── Dashboard Page Component ───────────────────────────────────────
export default function DashboardPage() {
  const [reports,          setReports]        = useState([]);
  const [stats,            setStats]          = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen,      setIsModalOpen]    = useState(false);
  const [loading,          setLoading]        = useState(false);
  const [searchQuery,      setSearchQuery]    = useState('');
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [aiResult,         setAiResult]       = useState(null);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingFile,  setPendingFile]  = useState(null);
  const pendingFormRef = useRef(null);

  const [formData, setFormData] = useState({ description: '', reporter_name: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [resList, resStats] = await Promise.all([
        axios.get(`${API_REPORTS}/?per_page=100`),
        axios.get(`${API_REPORTS}/stats/summary`),
      ]);
      setReports(resList.data.reports || []);
      setStats(resStats.data);
    } catch (err) { console.error("Fetch Error:", err); }
  };

  const submitReport = async (formPayload) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_REPORTS}/upload`, formPayload);
      if (res.data.ai_result) {
        setAiResult(res.data.ai_result);
      } else {
        alert("✅ อัปโหลดและสร้างรายงานสำเร็จ! (แต่ไม่ได้เปิดระบบ AI ไว้)");
      }
      setFormData({ description: '', reporter_name: '' });
      fetchData();
    } catch (err) {
      alert("❌ เกิดข้อผิดพลาด: " + (err.response?.data?.detail || "ไม่สามารถติดต่อ Server ได้"));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const base = new FormData();
    base.append('image',         file);
    base.append('description',   formData.description);
    base.append('reporter_name', formData.reporter_name);

    const hasGps = await readExifGpsClient(file);

    if (hasGps) {
      await submitReport(base);
    } else {
      setPendingFile(file);
      pendingFormRef.current = base;
      setShowPinModal(true);
    }
    e.target.value = ''; 
  };

  const handlePinConfirm = async (lat, lon) => {
    setShowPinModal(false);
    const fd = pendingFormRef.current;
    fd.append('latitude',  lat);
    fd.append('longitude', lon);
    await submitReport(fd);
    setPendingFile(null);
    pendingFormRef.current = null;
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    setPendingFile(null);
    pendingFormRef.current = null;
  };

  const viewDetail = async (id) => {
    try {
      const res = await axios.get(`${API_REPORTS}/${id}`);
      setSelectedReport(res.data);
      setIsModalOpen(true);
    } catch { alert("ไม่พบข้อมูลรายงาน"); }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.patch(`${API_REPORTS}/${id}/status`, { status: newStatus });
      fetchData();
      if (selectedReport) setSelectedReport(prev => ({ ...prev, status: newStatus }));
    } catch { alert("อัปเดตสถานะไม่สำเร็จ"); }
  };

  const deleteReport = async (id) => {
    if (!window.confirm("🗑️ คุณแน่ใจหรือไม่ที่จะลบรายงานนี้?")) return;
    try {
      await axios.delete(`${API_REPORTS}/${id}`);
      setIsModalOpen(false);
      fetchData();
    } catch { alert("ลบไม่สำเร็จ"); }
  };

  const filteredReports = reports.filter(r => {
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const q = searchQuery.toLowerCase();
    return matchesStatus && (
      (r.reporter_name || "").toLowerCase().includes(q) ||
      (r.description   || "").toLowerCase().includes(q)
    );
  });

  return (
    <MainLayout>
      <Sidebar formData={formData} setFormData={setFormData} handleFileChange={handleFileChange} loading={loading} />

      {/* ─── Main Content ─────────────────────────────────────── */}
      <main className="flex-1 p-8 overflow-y-auto">
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard title="รายงานทั้งหมด"  value={stats.total_reports}    color="blue"   icon={<LayoutDashboard size={20}/>}/>
            <StatCard title="รอดำเนินการ"    value={stats.pending_count}    color="yellow" icon={<Clock size={20}/>}/>
            <StatCard title="กำลังซ่อม"      value={stats.processing_count} color="blue"   icon={<AlertCircle size={20}/>}/>
            <StatCard title="เสร็จสิ้น"       value={stats.completed_count}  color="green"  icon={<CheckCircle size={20}/>}/>
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input
              type="text" placeholder="ค้นหาจากชื่อหรือรายละเอียด..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter size={18} className="text-slate-400"/>
            <select
              className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm outline-none text-sm font-medium"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">ทุกสถานะ</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[11px] uppercase tracking-[0.1em] font-bold">
              <tr>
                <th className="p-5">ข้อมูลผู้แจ้ง</th>
                <th className="p-5">สถานะ</th>
                <th className="p-5">พิกัด GPS</th>
                <th className="p-5 text-right">แอคชั่น</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredReports.length > 0 ? filteredReports.map(r => (
                <tr key={r.id} className="hover:bg-blue-50/40 transition-all group">
                  <td className="p-5">
                    <div className="font-bold text-slate-700">{r.reporter_name || "ไม่ระบุชื่อ"}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                      <Clock size={12}/> {r.created_at ? new Date(r.created_at).toLocaleString('th-TH') : '-'}
                    </div>
                  </td>
                  <td className="p-5"><StatusBadge status={r.status}/></td>
                  <td className="p-5">
                    {r.latitude
                      ? <div className="flex items-center gap-1 text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-md w-fit">
                          <MapPin size={12} className="text-red-500"/>
                          {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                        </div>
                      : <span className="text-xs text-slate-300 italic">ไม่มีข้อมูล GPS</span>}
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => viewDetail(r.id)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors shadow-sm bg-white border border-slate-100">
                        <Info size={18}/>
                      </button>
                      <button onClick={() => deleteReport(r.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors shadow-sm bg-white border border-slate-100">
                        <Trash2 size={18}/>
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="4" className="p-20 text-center text-slate-400 italic">ไม่พบข้อมูลรายงานในขณะนี้</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* ─── GPS Pin Modal ───────────────────────────────────── */}
      {showPinModal && <GpsPinModal pendingFile={pendingFile} onConfirm={handlePinConfirm} onCancel={handlePinCancel} />}

      {/* ─── AI Result Modal (ตอนอัปโหลดเสร็จ) ──────────────────── */}
      <AiResultModal aiResult={aiResult} onClose={() => setAiResult(null)} />
      {/* ─── Detail Modal (กดดูย้อนหลัง) ────────────────────────── */}
      <ReportDetailModal isOpen={isModalOpen} report={selectedReport} onClose={() => setIsModalOpen(false)} onUpdateStatus={updateStatus} />
    </MainLayout>
  );
}