import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, X, LocateFixed, AlertCircle, Navigation } from 'lucide-react';

const DEFAULT_CENTER = [14.9798, 102.0977]; // นครราชสีมา (fallback)

function FlyToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 16, { duration: 1.2 });
  }, [position, map]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function GpsPinModal({ pendingFile, onConfirm, onCancel }) {
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
