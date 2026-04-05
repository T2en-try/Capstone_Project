import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  LayoutDashboard, Trash2, Info, X,
  CheckCircle, Clock, AlertCircle, User, MapPin, Search, Filter, BrainCircuit, FileDigit, Navigation, LocateFixed
} from 'lucide-react';

// --- Fix Leaflet default marker icon ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const BASE_URL       = "http://127.0.0.1:8000";
const API_REPORTS    = `${BASE_URL}/api/reports`;
const DEFAULT_CENTER = [14.9798, 102.0977]; // นครราชสีมา (fallback)

// ─── FlyTo helper ─────────────────────────────────────────────
function FlyToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 16, { duration: 1.2 });
  }, [position, map]);
  return null;
}

// ─── Click-to-pin handler ─────────────────────────────────────
function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// ─── GPS Pin Modal ────────────────────────────────────────────
function GpsPinModal({ pendingFile, onConfirm, onCancel }) {
  const [markerPos, setMarkerPos] = useState(null);
  const [devicePos, setDevicePos] = useState(null);
  const [locating,  setLocating]  = useState(true);
  const [locError,  setLocError]  = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocating(false);
      setLocError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coord = [pos.coords.latitude, pos.coords.longitude];
        setDevicePos(coord);
        setMarkerPos(coord);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocError(true);
      },
      { timeout: 8000 }
    );
  }, []);

  const center = devicePos || DEFAULT_CENTER;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '92vh' }}>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-2xl shrink-0">
              <MapPin size={24} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black leading-tight">ไม่พบพิกัดในรูปภาพ</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">กรุณาปักหมุดตำแหน่งที่ต้องการแจ้งซ่อมบนแผนที่</p>
            </div>
            <button onClick={onCancel} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-700 transition-all shrink-0">
              <X size={18} />
            </button>
          </div>
          <div className="mt-3 bg-slate-700/50 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs">
            <span className="text-slate-400">📁</span>
            <span className="text-slate-300 font-mono truncate">{pendingFile?.name}</span>
            <span className="ml-auto text-slate-500 shrink-0">
              {pendingFile ? (pendingFile.size / 1024).toFixed(0) + ' KB' : ''}
            </span>
          </div>
        </div>

        <div className="relative" style={{ height: '340px' }}>
          {locating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 gap-3">
              <LocateFixed size={32} className="text-blue-500 animate-pulse" />
              <p className="text-sm text-slate-500 font-medium">กำลังหาตำแหน่งของคุณ...</p>
            </div>
          ) : (
            <MapContainer center={center} zoom={locError ? 11 : 15} style={{ height: '100%', width: '100%' }} zoomControl>
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapClickHandler onMapClick={(lat, lon) => setMarkerPos([lat, lon])} />
              {markerPos && (
                <>
                  <FlyToLocation position={markerPos} />
                  <Marker position={markerPos}>
                    <Popup>📍 {markerPos[0].toFixed(5)}, {markerPos[1].toFixed(5)}</Popup>
                  </Marker>
                </>
              )}
            </MapContainer>
          )}
          {!locating && !markerPos && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/80 text-white text-xs px-4 py-2 rounded-full backdrop-blur-sm pointer-events-none whitespace-nowrap">
              👆 แตะบนแผนที่เพื่อปักหมุด
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50">
          <div className={`mb-4 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm transition-all ${markerPos ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-slate-100 border border-slate-200 text-slate-400'}`}>
            <MapPin size={16} className={markerPos ? 'text-emerald-500 shrink-0' : 'text-slate-300 shrink-0'} />
            {markerPos ? <span className="font-mono font-bold text-sm">{markerPos[0].toFixed(6)}, {markerPos[1].toFixed(6)}</span> : <span className="italic text-[12px]">ยังไม่ได้ปักหมุด</span>}
            {locError && !markerPos && <span className="ml-auto text-[10px] text-amber-500 flex items-center gap-1 shrink-0"><AlertCircle size={12} /> ไม่พบ GPS เครื่อง</span>}
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-100 transition-all active:scale-95">
              ยกเลิก
            </button>
            <button onClick={() => markerPos && onConfirm(markerPos[0], markerPos[1])} disabled={!markerPos} className={`flex-[2] py-3 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${markerPos ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
              <Navigation size={16} /> ยืนยันตำแหน่งและส่งรายงาน
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper: อ่าน EXIF GPS ──────────────────────────────────
async function readExifGpsClient(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const view = new DataView(e.target.result);
        if (view.getUint16(0) !== 0xFFD8) { resolve(null); return; }
        let offset = 2;
        while (offset < view.byteLength - 4) {
          const marker = view.getUint16(offset);
          const segLen = view.getUint16(offset + 2);
          if (marker === 0xFFE1) {
            const h = String.fromCharCode(view.getUint8(offset+4), view.getUint8(offset+5), view.getUint8(offset+6), view.getUint8(offset+7));
            if (h === 'Exif') {
              const tiff = offset + 10;
              const littleEndian = view.getUint16(tiff) === 0x4949;
              const getU16 = (o) => view.getUint16(o, littleEndian);
              const getU32 = (o) => view.getUint32(o, littleEndian);
              const ifd0 = tiff + getU32(tiff + 4);
              const count = getU16(ifd0);
              for (let i = 0; i < count; i++) {
                if (getU16(ifd0 + 2 + i * 12) === 0x8825) { resolve(true); return; }
              }
            }
          }
          if (segLen < 2) break;
          offset += 2 + segLen;
        }
        resolve(null);
      } catch { resolve(null); }
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file.slice(0, 128 * 1024));
  });
}

// ─── App Main Component ───────────────────────────────────────
function App() {
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
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* ─── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-80 bg-slate-900 text-white p-6 hidden lg:flex flex-col shadow-2xl gap-4 overflow-y-auto">
        <h1 className="text-2xl font-black flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 italic drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">
          <LayoutDashboard /> ROAD-PREDICT AI
        </h1>

        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-inner flex flex-col gap-3">
          <p className="text-xs text-blue-400 uppercase font-black tracking-widest">New Report / แจ้งซ่อม</p>
          <input
            type="text" placeholder="ชื่อผู้รายงาน"
            className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm outline-none focus:border-blue-500 transition-all text-white"
            value={formData.reporter_name}
            onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
          />
          <textarea
            placeholder="รายละเอียดสภาพถนน..."
            className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm h-24 outline-none focus:border-blue-500 transition-all resize-none text-white"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <label className={`block w-full text-center py-3 rounded-xl font-bold cursor-pointer transition-all shadow-lg ${loading ? 'bg-slate-600 animate-pulse cursor-wait' : 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white'}`}>
            {loading ? "🤖 AI กำลังประมวลผล..." : "ถ่ายภาพ / เลือกรูปภาพ"}
            <input type="file" hidden onChange={handleFileChange} accept="image/*" disabled={loading} />
          </label>
          <p className="text-[10px] text-slate-600 text-center leading-relaxed">หากรูปไม่มีพิกัด GPS ระบบจะให้คุณปักหมุดตำแหน่งเอง</p>
        </div>

        <div className="mt-auto text-[10px] text-slate-500 text-center">Road Lifecycle Management System v1.0</div>
      </aside>

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
      {aiResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white text-center">
              <BrainCircuit size={48} className="mx-auto mb-3 opacity-90"/>
              <h2 className="text-2xl font-black tracking-tight">AI Analysis Complete!</h2>
              <p className="text-sm opacity-80 mt-1">ระบบวิเคราะห์สภาพถนนและสิ่งแวดล้อมเสร็จสิ้น</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-bold uppercase mb-1">พื้นที่เสียหาย</p>
                  <p className="text-2xl font-black text-rose-500">{Number(aiResult.cv_features?.cv_damage_ratio_percent).toFixed(2)}%</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-bold uppercase mb-1">ความรุนแรงสูงสุด</p>
                  <p className="text-2xl font-black text-orange-500">Lv.{aiResult.cv_features?.cv_max_severity_score}</p>
                </div>
              </div>
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 text-sm">
                <p className="font-bold text-blue-800 mb-2 flex items-center gap-2"><MapPin size={16}/> ข้อมูลพื้นที่ (Context)</p>
                <ul className="space-y-2 text-slate-600">
                  <li>🛣️ <span className="font-medium">ประเภทถนน:</span> {aiResult.context_data?.gis?.thai_road_type}</li>
                  <li>🧱 <span className="font-medium">วัสดุพื้นผิว:</span> {aiResult.context_data?.gee?.estimated_material}</li>
                  <li>💧 <span className="font-medium">ความชื้นดิน:</span> {aiResult.context_data?.gee?.soil_moisture_last_30d_mm}</li>
                  <li>🌿 <span className="font-medium">ดัชนีพืชพรรณ (NDVI):</span> {aiResult.context_data?.gee?.ndvi_index}</li>
                  <li>💡 <span className="font-medium">แสงสว่างกลางคืน:</span> {aiResult.context_data?.gee?.nightlight_radiance}</li>
                  <li>🌧️ <span className="font-medium">ฝนตกสะสม:</span> {aiResult.context_data?.gee?.rainfall_last_12m_mm} mm</li>
                  <li>👥 <span className="font-medium">แจ้งเหตุซ้ำ:</span> {aiResult.context_data?.crowdsource?.crowdsource_report_count_30d} ครั้ง</li>
                </ul>
              </div>
              
              {/* ✅ โค้ดแสดงผล Late Fusion */}
              {aiResult.fusion_result && (
                <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-sm mt-3">
                  <p className="font-bold text-purple-800 mb-1 flex items-center gap-2">🎯 สรุปผลประเมิน (Late Fusion)</p>
                  <div className="text-xl font-black text-purple-600 mb-1">{aiResult.fusion_result.final_decision}</div>
                  <p className="text-xs text-purple-400">คะแนนความเสี่ยงสุทธิ: {Number(aiResult.fusion_result.fusion_score).toFixed(2)}</p>
                </div>
              )}

            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <button onClick={() => setAiResult(null)} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95">
                รับทราบและปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Detail Modal (กดดูย้อนหลัง) ────────────────────────── */}
      {isModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] max-w-4xl w-full shadow-2xl overflow-hidden relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 bg-slate-100 text-slate-500 p-2 rounded-full hover:bg-red-500 hover:text-white transition-all z-20 shadow-sm">
              <X size={20}/>
            </button>
            <div className="flex flex-col md:flex-row max-h-[90vh] overflow-y-auto md:overflow-hidden">
              <div className="md:w-1/2 bg-slate-200 flex items-center justify-center relative min-h-[300px]">
                {selectedReport?.image_filename
                  ? <img src={`${BASE_URL}/uploads/${selectedReport.image_filename}`} className="w-full h-full object-cover" alt="Road damage" onError={(e) => { e.target.style.display='none'; }}/>
                  : <div className="flex flex-col items-center text-slate-400 opacity-50"><p className="text-[10px] font-black uppercase tracking-[0.2em]">Image Not Found</p></div>}
                <div className="absolute bottom-4 left-4">
                  <StatusBadge status={selectedReport.status} size="lg"/>
                </div>
              </div>

              <div className="md:w-1/2 p-10 flex flex-col bg-white overflow-y-auto">
                <div className="mb-4">
                  <h2 className="text-3xl font-black text-slate-800 mb-1 leading-tight">รายละเอียดรายงาน</h2>
                  <p className="text-slate-400 font-mono text-xs tracking-tighter uppercase">Report ID: {selectedReport.id}</p>
                </div>
                <div className="grid grid-cols-1 gap-4 mb-6 flex-1">
                  <DetailItem icon={<User className="text-blue-500"/>} label="ผู้รายงาน" value={selectedReport.reporter_name || "ไม่ระบุชื่อ"}/>
                  <DetailItem
                    icon={<MapPin className="text-red-500"/>}
                    label="ตำแหน่งพิกัด"
                    value={selectedReport.latitude
                      ? <span className="flex items-center gap-2">
                          {selectedReport.latitude.toFixed(6)}, {selectedReport.longitude.toFixed(6)}
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase border border-slate-200">{selectedReport.gps_source || 'Unknown'}</span>
                        </span>
                      : "ไม่มีข้อมูล GPS"}
                  />
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><Clock size={12}/> วันเวลาที่บันทึก</p>
                      <p className="text-sm font-bold text-slate-700">{selectedReport.created_at ? new Date(selectedReport.created_at).toLocaleString('th-TH') : '-'}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><FileDigit size={12}/> ข้อมูลไฟล์ภาพ</p>
                      <p className="text-sm font-bold text-slate-700">
                        {selectedReport.image_size_bytes ? (selectedReport.image_size_bytes/1024).toFixed(1)+' KB' : 'N/A'}
                        <span className="text-[10px] text-slate-400 font-normal block mt-0.5">{selectedReport.image_mime_type||'Unknown Type'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-widest flex items-center gap-2"><AlertCircle size={12}/> คำอธิบายเพิ่มเติม</p>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-600 text-sm italic leading-relaxed shadow-inner">
                      "{selectedReport.description || "ไม่มีคำอธิบายเพิ่มเติม"}"
                    </div>
                  </div>
                </div>

                {selectedReport.ai_result && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-[10px] text-blue-500 font-black uppercase mb-3 tracking-widest flex items-center gap-2"><BrainCircuit size={14}/> ข้อมูลเชิงลึกจาก AI</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100">
                        <p className="text-[10px] text-rose-400 font-bold uppercase mb-1">ความเสียหาย</p>
                        <p className="text-xl font-black text-rose-600">{Number(selectedReport.ai_result.cv_features?.cv_damage_ratio_percent).toFixed(2)}%</p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-2xl border border-orange-100">
                        <p className="text-[10px] text-orange-400 font-bold uppercase mb-1">ระดับความรุนแรง</p>
                        <p className="text-xl font-black text-orange-600">Lv.{selectedReport.ai_result.cv_features?.cv_max_severity_score}</p>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-xs text-blue-800 space-y-1.5">
                      <p>🛣️ <span className="font-bold">ประเภทถนน:</span> {selectedReport.ai_result.context_data?.gis?.thai_road_type}</p>
                      <p>🌧️ <span className="font-bold">ฝนตกสะสม:</span> {selectedReport.ai_result.context_data?.gee?.rainfall_last_12m_mm} mm</p>
                      <p>👥 <span className="font-bold">ประวัติแจ้งซ้ำ:</span> {selectedReport.ai_result.context_data?.crowdsource?.crowdsource_report_count_30d} ครั้ง</p>
                    </div>

                    {/* ✅ โค้ดแสดงผล Late Fusion */}
                    {selectedReport.ai_result.fusion_result && (
                      <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-sm mt-3">
                        <p className="font-bold text-purple-800 mb-1 flex items-center gap-2">🎯 สรุปผลประเมิน (Late Fusion)</p>
                        <div className="text-xl font-black text-purple-600 mb-1">{selectedReport.ai_result.fusion_result.final_decision}</div>
                        <p className="text-xs text-purple-400">คะแนนความเสี่ยงสุทธิ: {Number(selectedReport.ai_result.fusion_result.fusion_score).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-6 border-t border-slate-100 mt-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {['pending','processing','completed','rejected'].map(s => (
                      <button key={s} onClick={() => updateStatus(selectedReport.id, s)}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${selectedReport.status===s ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-300 hover:text-blue-500'}`}>
                        {s.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────
const StatCard = ({ title, value, color, icon }) => {
  const colors = { blue: 'bg-blue-600', yellow: 'bg-yellow-600', green: 'bg-green-600' };
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">{icon}</div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <div className="text-3xl font-black text-slate-800 tracking-tighter">{value?.toLocaleString() || 0}</div>
      <div className={`h-1.5 w-8 mt-3 rounded-full ${colors[color]}`}></div>
    </div>
  );
};

const StatusBadge = ({ status, size = 'sm' }) => {
  const styles = {
    pending:    'bg-amber-100 text-amber-700 ring-amber-600/20',
    processing: 'bg-blue-100 text-blue-700 ring-blue-600/20',
    completed:  'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
    rejected:   'bg-rose-100 text-rose-700 ring-rose-600/20',
  };
  return (
    <span className={`inline-flex items-center rounded-full font-bold uppercase tracking-wider ring-1 ring-inset ${styles[status]} ${size==='sm' ? 'px-2.5 py-1 text-[10px]' : 'px-4 py-1.5 text-xs shadow-lg backdrop-blur-md'}`}>
      {status}
    </span>
  );
};

const DetailItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-4">
    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">{icon}</div>
    <div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1.5">{label}</p>
      <div className="text-base font-bold text-slate-700">{value}</div>
    </div>
  </div>
);

export default App;