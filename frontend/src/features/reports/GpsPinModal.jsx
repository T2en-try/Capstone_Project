import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, X, LocateFixed, AlertCircle, Navigation, Crosshair, Search, Loader2 } from 'lucide-react';

const DEFAULT_CENTER = [14.9798, 102.0977]; // นครราชสีมา (fallback)

function FlyToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 17, { duration: 1.2 });
  }, [position, map]);
  return null;
}

function CenterCrosshairHandler({ onCenterChanged }) {
  const map = useMapEvents({
    move: () => {
      const center = map.getCenter();
      onCenterChanged([center.lat, center.lng]);
    },
    moveend: () => {
      const center = map.getCenter();
      onCenterChanged([center.lat, center.lng]);
    }
  });
  return null;
}

export default function GpsPinModal({ pendingFile, onConfirm, onCancel }) {
  const [devicePos, setDevicePos] = useState(null);
  const [centerPos, setCenterPos] = useState(DEFAULT_CENTER);
  const [flyToPos,  setFlyToPos]  = useState(null);
  const [locating,  setLocating]  = useState(true);
  const [locError,  setLocError]  = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

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
        setCenterPos(coord);
        setFlyToPos(coord);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocError(true);
      },
      { timeout: 8000 }
    );
  }, []);

  const initCenter = devicePos || DEFAULT_CENTER;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=th`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setFlyToPos([lat, lon]);
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '95vh' }}>
        
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-2xl shrink-0">
              <MapPin size={24} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black leading-tight">ไม่พบพิกัดในรูปภาพ</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">เลื่อนแผนที่เพื่อให้หมุดอยู่ตรงกับจุดเกิดเหตุ</p>
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

        {/* Map Container */}
        <div className="relative" style={{ height: '450px' }}>
          {locating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 gap-3">
              <LocateFixed size={32} className="text-blue-500 animate-pulse" />
              <p className="text-sm text-slate-500 font-medium">กำลังหาตำแหน่งปัจจุบันของคุณ...</p>
            </div>
          ) : (
            <>
              <MapContainer center={initCenter} zoom={locError ? 11 : 17} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer
                  attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                />
                {/* Street/Label Overlay for Context */}
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                />
                <CenterCrosshairHandler onCenterChanged={setCenterPos} />
                {flyToPos && <FlyToLocation position={flyToPos} />}
              </MapContainer>

              {/* Search Bar Overlay */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-[320px] z-[1000]">
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาสถานที่..."
                    className="w-full bg-white/95 backdrop-blur-md border border-white/20 text-slate-800 text-sm font-medium rounded-2xl pl-11 pr-4 py-3 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.3)] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button type="submit" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors">
                    {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  </button>
                </form>
                
                {searchResults.length > 0 && (
                  <div className="mt-2 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                    {searchResults.map((res, i) => (
                      <button
                        key={i}
                        onClick={() => selectSearchResult(res)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-100 border-b border-slate-100 last:border-0 text-sm text-slate-700 truncate transition-colors font-medium"
                      >
                        {res.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fixed Center Pin Overlay */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[1000] pointer-events-none flex flex-col items-center">
                <div className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full mb-1 shadow-lg animate-bounce uppercase tracking-widest border border-white/20">
                  จุดเกิดเหตุ
                </div>
                <MapPin size={46} className="text-rose-500 drop-shadow-[0_6px_6px_rgba(0,0,0,0.6)]" fill="currentColor" />
                <div className="w-2.5 h-1.5 bg-black/40 rounded-[100%] mt-[-4px] blur-[1px]"></div>
              </div>

              {/* Interaction Hint */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/80 text-white text-xs font-bold px-5 py-2.5 rounded-full backdrop-blur-md pointer-events-none whitespace-nowrap shadow-xl border border-white/10 flex items-center gap-2">
                👆 เลื่อนแผนที่เพื่อกำหนดตำแหน่ง
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 bg-white shrink-0">
          <div className="mb-4 bg-slate-900 rounded-2xl px-4 py-3.5 flex items-center justify-between text-white shadow-inner">
            <div className="flex items-center gap-3">
              <Crosshair size={18} className="text-blue-400" />
              <span className="font-mono font-bold text-[15px] tracking-wider text-slate-100">
                {centerPos[0].toFixed(6)}, {centerPos[1].toFixed(6)}
              </span>
            </div>
            {locError && <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg flex items-center gap-1"><AlertCircle size={12} /> ไม่พบ GPS เครื่อง</span>}
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-500 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95">
              ยกเลิก
            </button>
            <button 
              onClick={() => onConfirm(centerPos[0], centerPos[1])} 
              className="flex-[2] py-4 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-[0_8px_16px_-6px_rgba(37,99,235,0.5)]"
            >
              <Navigation size={18} /> ยืนยันพิกัดและส่งรายงาน
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
