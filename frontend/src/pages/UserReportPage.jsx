import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import 'leaflet/dist/leaflet.css';
import {
  Trash2, Info, Clock, MapPin, Search, Filter, Eye
} from 'lucide-react';
import { API_REPORTS } from '../services/api';
import { readExifGpsClient } from '../utils/exifGps';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import GpsPinModal from '../features/reports/GpsPinModal';
import AiResultModal from '../features/reports/AiResultModal';
import ReportDetailModal from '../features/reports/ReportDetailModal';
import HeatmapPanel from '../features/reports/HeatmapPanel';
import MainLayout from '../layouts/MainLayout';
import Sidebar from '../layouts/Sidebar';
import Navbar from '../layouts/Navbar';

export default function UserReportPage() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [aiResult, setAiResult] = useState(null);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const pendingFormRef = useRef(null);

  const [formData, setFormData] = useState({ description: '', reporter_name: '' });
  const [mapPoints, setMapPoints] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setMapLoading(true);
    try {
      const [resList, resStats, resMap] = await Promise.all([
        axios.get(`${API_REPORTS}/?per_page=100`),
        axios.get(`${API_REPORTS}/stats/summary`),
        axios.get(`${API_REPORTS}/map/points`),
      ]);
      setReports(resList.data.reports || []);
      setStats(resStats.data);
      setMapPoints(resMap.data.points || []);
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setMapLoading(false);
    }
  };

  const submitReport = async (formPayload) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_REPORTS}/upload`, formPayload);
      if (res.data.ai_result) {
        setAiResult(res.data.ai_result);
      } else {
        alert('ส่งรายงานสำเร็จแล้ว');
      }
      setFormData({ description: '', reporter_name: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const hasGps = await readExifGpsClient(file);

    let compressedFile = file;
    try {
      compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        preserveExif: true,
      });
    } catch (err) {
      console.error('Image compression failed, falling back to original:', err);
    }

    const base = new FormData();
    base.append('image', new File([compressedFile], file.name, { type: compressedFile.type || file.type }));
    base.append('description', formData.description);
    base.append('reporter_name', formData.reporter_name);

    if (hasGps) {
      await submitReport(base);
    } else {
      setLoading(false);
      setPendingFile(compressedFile);
      pendingFormRef.current = base;
      setShowPinModal(true);
    }
    e.target.value = '';
  };

  const handlePinConfirm = async (lat, lon) => {
    setShowPinModal(false);
    const fd = pendingFormRef.current;
    fd.append('latitude', lat);
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
    } catch {
      alert('ไม่พบข้อมูลรายงาน');
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.patch(`${API_REPORTS}/${id}/status`, { status: newStatus });
      fetchData();
      if (selectedReport) setSelectedReport((prev) => ({ ...prev, status: newStatus }));
    } catch {
      alert('อัปเดตสถานะไม่สำเร็จ');
    }
  };

  const deleteReport = async (id) => {
    if (!window.confirm('ต้องการลบรายงานนี้หรือไม่?')) return;
    try {
      await axios.delete(`${API_REPORTS}/${id}`);
      setIsModalOpen(false);
      fetchData();
    } catch {
      alert('ลบไม่สำเร็จ');
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const q = searchQuery.toLowerCase();
    return (
      matchesStatus &&
      ((r.reporter_name || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q))
    );
  });

  return (
    <MainLayout>
      <Navbar />
      {/* Header กึ่งทางการ — แบรนด์เป็นสัญญาณหลัก */}
      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-end justify-between gap-4">
          <div className="anim-rise">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-soft/70 uppercase">
              ROAD-PREDICT AI
            </p>
            <h1 className="font-display text-3xl sm:text-4xl text-ink leading-none brand-mark inline-block">
              ถนนแจ้ง
            </h1>
            <p className="text-sm text-asphalt/65 mt-2 max-w-md leading-relaxed">
              แจ้งซ่อมถนนง่าย ๆ สำหรับประชาชน · วิเคราะห์ด้วย AI
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8">
        <Sidebar
          formData={formData}
          setFormData={setFormData}
          handleFileChange={handleFileChange}
          loading={loading}
        />

        <main className="flex-1 min-w-0 anim-rise-delay">
          {/* สรุปตัวเลขแบบแถบ — ไม่ใช่การ์ดหนาแน่น */}
          {stats && (
            <div className="flex flex-wrap gap-x-8 gap-y-4 pb-5 mb-5 border-b border-line">
              <StatCard title="รายงานทั้งหมด" value={stats.total_reports} />
              <StatCard title="รอรับเรื่อง" value={stats.pending_count} />
              <StatCard title="กำลังดำเนินการ" value={stats.processing_count} />
              <StatCard title="เสร็จสิ้น" value={stats.completed_count} />
            </div>
          )}

          <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div>
              <h2 className="font-display text-xl text-ink">รายการที่แจ้งเข้ามา</h2>
              <p className="text-sm text-asphalt/55 mt-0.5">ติดตามสถานะการซ่อมได้จากรายการด้านล่าง</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-asphalt/40" size={16} />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อหรือรายละเอียด"
                  className="w-full pl-9 pr-3 py-2.5 bg-paper border border-line rounded-xl text-sm outline-none focus:border-ink-soft focus:ring-2 focus:ring-ink/10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-asphalt/40 shrink-0" />
                <select
                  className="bg-paper border border-line py-2.5 px-3 rounded-xl outline-none text-sm font-medium"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="pending">รอรับเรื่อง</option>
                  <option value="processing">กำลังดำเนินการ</option>
                  <option value="completed">เสร็จสิ้น</option>
                  <option value="rejected">ไม่ผ่านการตรวจ</option>
                </select>
              </div>
            </div>
          </div>

          {/* รายการแบบ feed อ่านง่าย */}
          <div className="border border-line rounded-2xl bg-paper/80 overflow-hidden divide-y divide-line">
            {filteredReports.length > 0 ? (
              filteredReports.map((r) => (
                <article
                  key={r.id}
                  className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-mist/70 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-ink truncate">
                        {r.reporter_name || 'ไม่ระบุชื่อ'}
                      </h3>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-sm text-asphalt/70 line-clamp-2">
                      {r.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-asphalt/50">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} />
                        {r.created_at ? new Date(r.created_at).toLocaleString('th-TH') : '-'}
                      </span>
                      {r.latitude ? (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <MapPin size={12} className="text-danger" />
                          {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                        </span>
                      ) : (
                        <span>ไม่มีพิกัด</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => viewDetail(r.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-ink text-paper hover:bg-ink-soft transition-colors"
                    >
                      <Eye size={15} />
                      ดูรายละเอียด
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteReport(r.id)}
                      className="p-2 rounded-xl text-asphalt/40 hover:text-danger hover:bg-danger/10 transition-colors"
                      title="ลบรายงาน"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="py-16 px-6 text-center">
                <Info size={28} className="mx-auto text-line mb-3" />
                <p className="font-display text-lg text-ink">ยังไม่มีรายการแจ้ง</p>
                <p className="text-sm text-asphalt/55 mt-1">
                  เมื่อมีผู้แจ้งซ่อม รายการจะแสดงที่นี่
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      <HeatmapPanel points={mapPoints} loading={mapLoading} />

      {showPinModal && (
        <GpsPinModal pendingFile={pendingFile} onConfirm={handlePinConfirm} onCancel={handlePinCancel} />
      )}
      <AiResultModal aiResult={aiResult} onClose={() => setAiResult(null)} />
      <ReportDetailModal
        isOpen={isModalOpen}
        report={selectedReport}
        onClose={() => setIsModalOpen(false)}
        onUpdateStatus={updateStatus}
      />
    </MainLayout>
  );
}
