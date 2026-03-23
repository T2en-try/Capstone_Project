import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard, UploadCloud, Trash2, Info, X, 
  CheckCircle, Clock, AlertCircle, User, MapPin, Search, Filter, HardHat
} from 'lucide-react';

// --- CONFIGURATION ---
const BASE_URL = "http://127.0.0.1:8000";
const API_REPORTS = `${BASE_URL}/api/reports`;


function App() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  

  const [formData, setFormData] = useState({
    description: '',
    reporter_name: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  // --- GET ALL & STATS ---
  const fetchData = async () => {
    try {
      // แก้ไขจาก API_BASE เป็น API_REPORTS
      const [resList, resStats] = await Promise.all([
        axios.get(`${API_REPORTS}/?per_page=100`),
        axios.get(`${API_REPORTS}/stats/summary`)
      ]);
      
      console.log("Data from API:", resList.data);
      setReports(resList.data.reports || []);
      setStats(resStats.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  // --- 1. POST /api/reports/upload ---
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('image', file); 
    data.append('description', formData.description);
    data.append('reporter_name', formData.reporter_name);

    setLoading(true);
    try {
      await axios.post(`${API_REPORTS}/upload`, data);
      alert("✅ อัปโหลดและสร้างรายงานสำเร็จ!");
      setFormData({ description: '', reporter_name: '' });
      fetchData(); 
    } catch (err) {
      alert("❌ เกิดข้อผิดพลาด: " + (err.response?.data?.detail || "ไม่สามารถติดต่อ Server ได้"));
    } finally {
      setLoading(false);
    }
  };

  // --- 2. GET /api/reports/{id} ---
  const viewDetail = async (id) => {
    try {
      const res = await axios.get(`${API_REPORTS}/${id}`);
      setSelectedReport(res.data);
      setIsModalOpen(true);
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      alert("ไม่พบข้อมูลรายงาน");
    }
  };

  // --- 3. PATCH /api/reports/{id}/status ---
  const updateStatus = async (id, newStatus) => {
    try {
      await axios.patch(`${API_REPORTS}/${id}/status`, { status: newStatus });
      fetchData(); 
      if (selectedReport) setSelectedReport(prev => ({ ...prev, status: newStatus }));
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      alert("อัปเดตสถานะไม่สำเร็จ");
    }
  };

  // --- 4. DELETE /api/reports/{id} ---
  const deleteReport = async (id) => {
    if (!window.confirm("🗑️ คุณแน่ใจหรือไม่ที่จะลบรายงานนี้?")) return;
    try {
      await axios.delete(`${API_REPORTS}/${id}`);
      setIsModalOpen(false);
      fetchData();
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      alert("ลบไม่สำเร็จ");
    }
  };

  const filteredReports = reports.filter(r => {
      const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
      
      const query = searchQuery.toLowerCase();
      
      const matchesSearch = (
        (r.reporter_name || "").toLowerCase().includes(query) || 
        (r.description || "").toLowerCase().includes(query)
      );
      
      return matchesStatus && matchesSearch;
    });

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-80 bg-slate-900 text-white p-6 hidden lg:flex flex-col shadow-2xl">
        <h1 className="text-2xl font-black mb-10 flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 italic drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">      
          <LayoutDashboard /> ROAD-PREDICT AI
        </h1>
        
        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-inner">
          <p className="text-xs text-blue-400 uppercase font-black mb-4 tracking-widest">New Report / แจ้งซ่อม</p>
          <div className="space-y-3">
            <input 
              type="text" placeholder="ชื่อผู้รายงาน" 
              className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm outline-none focus:border-blue-500 transition-all text-white"
              value={formData.reporter_name}
              onChange={(e) => setFormData({...formData, reporter_name: e.target.value})}
            />
            <textarea 
              placeholder="รายละเอียดสภาพถนน..." 
              className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm h-28 outline-none focus:border-blue-500 transition-all resize-none text-white"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
            <label className={`block w-full text-center py-3 rounded-xl font-bold cursor-pointer transition-all shadow-lg ${loading ? 'bg-slate-600' : 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white'}`}>
              {loading ? "AI กำลังวิเคราะห์..." : "เลือกรูปภาพและส่ง"}
              <input type="file" hidden onChange={handleUpload} accept="image/*" disabled={loading} />
            </label>
          </div>
        </div>

        <div className="mt-auto text-[10px] text-slate-500 text-center">
          Road Lifecycle Management System v1.0
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard title="รายงานทั้งหมด" value={stats.total_reports} color="blue" icon={<LayoutDashboard size={20}/>} />
            <StatCard title="รอดำเนินการ" value={stats.pending_count} color="yellow" icon={<Clock size={20}/>} />
            <StatCard title="กำลังซ่อม" value={stats.processing_count} color="blue" icon={<AlertCircle size={20}/>} />
            <StatCard title="เสร็จสิ้น" value={stats.completed_count} color="green" icon={<CheckCircle size={20}/>} />
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text" placeholder="ค้นหาจากชื่อหรือรายละเอียด..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter size={18} className="text-slate-400" />
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
                      <Clock size={12} /> {r.created_at ? new Date(r.created_at).toLocaleString('th-TH') : '-'}
                    </div>
                  </td>
                  <td className="p-5">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="p-5">
                    {r.latitude ? (
                      <div className="flex items-center gap-1 text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-md w-fit">
                        <MapPin size={12} className="text-red-500" />
                        {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                      </div>
                    ) : <span className="text-xs text-slate-300 italic">ไม่มีข้อมูล GPS</span>}
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
                <tr>
                  <td colSpan="4" className="p-20 text-center text-slate-400 italic">ไม่พบข้อมูลรายงานในขณะนี้</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Detail Modal */}
      {isModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] max-w-4xl w-full shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-6 right-6 bg-slate-100 text-slate-500 p-2 rounded-full hover:bg-red-500 hover:text-white transition-all z-20 shadow-sm"
            >
              <X size={20}/>
            </button>
            
            <div className="flex flex-col md:flex-row h-full max-h-[90vh] overflow-y-auto md:overflow-hidden">
              {/* Image Section - Updated with safe Error Handling */}
             <div className="md:w-1/2 bg-slate-200 flex items-center justify-center relative min-h-[300px] group">
                {selectedReport?.image_filename ? (
                  <img 
                    src={`${BASE_URL}/uploads/${selectedReport.image_filename}`}
                    className="w-full h-full object-cover" 
                    alt="Road damage"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const parent = e.target.parentNode;
                      const fallback = document.createElement('div');
                      fallback.className = "flex flex-col items-center text-slate-400 opacity-50";
                      fallback.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        <p class="text-[10px] font-black uppercase tracking-[0.2em]">Image Not Found</p>
                      `;
                      parent.appendChild(fallback);
                    }}
                  />
                ) : (
                  /* กรณีไม่มีข้อมูลรูปภาพ ให้โชว์ Icon รอไว้เลย */
                  <div className="flex flex-col items-center text-slate-400 opacity-50">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Select a report to view image</p>
                  </div>
                )}

                {/* เช็ค StatusBadge ด้วยเพื่อความปลอดภัย */}
                {selectedReport && (
                  <div className="absolute bottom-4 left-4">
                    <StatusBadge status={selectedReport.status} size="lg" />
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="md:w-1/2 p-10 flex flex-col bg-white">
                <div className="mb-6">
                  <h2 className="text-3xl font-black text-slate-800 mb-1 leading-tight">รายละเอียดรายงาน</h2>
                  <p className="text-slate-400 font-mono text-xs tracking-tighter uppercase">Report ID: {selectedReport.id}</p>
                </div>
                
                <div className="grid grid-cols-1 gap-6 mb-8 flex-1">
                  <DetailItem icon={<User className="text-blue-500" />} label="ผู้รายงาน" value={selectedReport.reporter_name || "ไม่ระบุชื่อ"} />
                  <DetailItem 
                    icon={<MapPin className="text-red-500" />} 
                    label="ตำแหน่งพิกัด" 
                    value={selectedReport.latitude ? `${selectedReport.latitude.toFixed(6)}, ${selectedReport.longitude.toFixed(6)}` : "ไม่มีข้อมูล GPS"} 
                  />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-widest flex items-center gap-2">
                      <AlertCircle size={12}/> คำอธิบายเพิ่มเติม
                    </p>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-600 text-sm italic leading-relaxed shadow-inner">
                      "{selectedReport.description || "ไม่มีคำอธิบายเพิ่มเติม"}"
                    </div>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {['pending', 'processing', 'completed', 'rejected'].map(s => (
                      <button 
                        key={s} 
                        onClick={() => updateStatus(selectedReport.id, s)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${selectedReport.status === s ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-300 hover:text-blue-500'}`}
                      >
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

// Helper Components
const StatCard = ({ title, value, color, icon }) => {
  const colors = {
    blue: 'text-blue-600 bg-blue-600',
    yellow: 'text-yellow-600 bg-yellow-600',
    green: 'text-green-600 bg-green-600'
  };
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
    pending: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    processing: 'bg-blue-100 text-blue-700 ring-blue-600/20',
    completed: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
    rejected: 'bg-rose-100 text-rose-700 ring-rose-600/20',
  };
  return (
    <span className={`inline-flex items-center rounded-full font-bold uppercase tracking-wider ring-1 ring-inset ${styles[status]} ${size === 'sm' ? 'px-2.5 py-1 text-[10px]' : 'px-4 py-1.5 text-xs shadow-lg backdrop-blur-md'}`}>
      {status}
    </span>
  );
};

const DetailItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-4">
    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">{icon}</div>
    <div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1.5">{label}</p>
      <p className="text-base font-bold text-slate-700">{value}</p>
    </div>
  </div>
);

export default App; 