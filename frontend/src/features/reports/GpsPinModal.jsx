import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap, ScaleControl, ZoomControl } from 'react-leaflet';
import {
  MapPin, X, LocateFixed, AlertCircle, Navigation, Crosshair,
  Search, Loader2, Satellite, Map as MapIcon, Layers
} from 'lucide-react';

const DEFAULT_CENTER = [14.9798, 102.0977]; // นครราชสีมา (fallback)

const MAP_LAYERS = {
  hybrid: {
    id: 'hybrid',
    label: 'ผสม',
    icon: Layers,
    base: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri',
      maxZoom: 22,
      maxNativeZoom: 19,
    },
    overlay: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      maxZoom: 22,
      maxNativeZoom: 19,
    },
  },
  satellite: {
    id: 'satellite',
    label: 'ดาวเทียม',
    icon: Satellite,
    base: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri',
      maxZoom: 22,
      maxNativeZoom: 19,
    },
  },
  streets: {
    id: 'streets',
    label: 'ถนน',
    icon: MapIcon,
    base: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap',
      maxZoom: 22,
      maxNativeZoom: 19,
    },
  },
};

function FlyToLocation({ position, zoom = 19 }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, zoom, { duration: 1.1 });
  }, [position, map, zoom]);
  return null;
}

function CenterCrosshairHandler({ onCenterChanged }) {
  useMapEvents({
    move: (e) => {
      const center = e.target.getCenter();
      onCenterChanged([center.lat, center.lng]);
    },
    moveend: (e) => {
      const center = e.target.getCenter();
      onCenterChanged([center.lat, center.lng]);
    },
  });
  return null;
}

function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export default function GpsPinModal({ pendingFile, onConfirm, onCancel }) {
  const [devicePos, setDevicePos] = useState(null);
  const [centerPos, setCenterPos] = useState(DEFAULT_CENTER);
  const [flyToPos, setFlyToPos] = useState(null);
  const [flyZoom, setFlyZoom] = useState(19);
  const [locating, setLocating] = useState(true);
  const [locError, setLocError] = useState(false);
  const [activeLayer, setActiveLayer] = useState('hybrid');

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
        setFlyZoom(19);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocError(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const initCenter = devicePos || DEFAULT_CENTER;
  const layer = MAP_LAYERS[activeLayer];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=th&limit=8&addressdetails=1`
      );
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setFlyToPos([lat, lon]);
    setFlyZoom(19);
    setSearchResults([]);
    setSearchQuery('');
  };

  const goToMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coord = [pos.coords.latitude, pos.coords.longitude];
        setDevicePos(coord);
        setFlyToPos(coord);
        setFlyZoom(20);
        setLocError(false);
      },
      () => setLocError(true),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-ink/55 backdrop-blur-sm">
      <div
        className="bg-paper rounded-2xl w-full max-w-2xl border border-line overflow-hidden flex flex-col"
        style={{ maxHeight: '95vh' }}
      >
        {/* Header */}
        <div className="bg-ink p-5 text-paper shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-mark/20 rounded-xl shrink-0">
              <MapPin size={22} className="text-mark" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-lg leading-tight">ระบุตำแหน่งบนแผนที่</h2>
              <p className="text-[12px] text-paper/60 mt-0.5 leading-relaxed">
                ซูมเข้าใกล้แล้วเลื่อนแผนที่ให้หมุดอยู่ตรงจุดที่ต้องการแจ้งซ่อม
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 rounded-xl text-paper/50 hover:text-paper hover:bg-ink-soft transition-all shrink-0"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-3 bg-ink-soft/80 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs">
            <span className="text-paper/50 shrink-0">ไฟล์</span>
            <span className="text-paper/80 font-mono truncate">{pendingFile?.name}</span>
            <span className="ml-auto text-paper/45 shrink-0">
              {pendingFile ? (pendingFile.size / 1024).toFixed(0) + ' KB' : ''}
            </span>
          </div>
        </div>

        {/* Map */}
        <div className="relative" style={{ height: '480px' }}>
          {locating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 gap-3">
              <LocateFixed size={32} className="text-blue-500 animate-pulse" />
              <p className="text-sm text-slate-500 font-medium">กำลังหาตำแหน่งปัจจุบันของคุณ...</p>
            </div>
          ) : (
            <>
              <MapContainer
                center={initCenter}
                zoom={locError ? 12 : 19}
                maxZoom={22}
                minZoom={5}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  key={`base-${activeLayer}`}
                  attribution={layer.base.attribution}
                  url={layer.base.url}
                  maxZoom={layer.base.maxZoom}
                  maxNativeZoom={layer.base.maxNativeZoom}
                />
                {layer.overlay && (
                  <TileLayer
                    key={`overlay-${activeLayer}`}
                    url={layer.overlay.url}
                    maxZoom={layer.overlay.maxZoom}
                    maxNativeZoom={layer.overlay.maxNativeZoom}
                    opacity={0.9}
                  />
                )}
                <ZoomControl position="bottomright" />
                <ScaleControl position="bottomleft" imperial={false} />
                <CenterCrosshairHandler onCenterChanged={setCenterPos} />
                {flyToPos && <FlyToLocation position={flyToPos} zoom={flyZoom} />}
                <MapInvalidateSize />
              </MapContainer>

              {/* Search */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[90%] max-w-[360px] z-[1000]">
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาสถานที่ / ถนน / หมู่บ้าน..."
                    className="w-full bg-white/95 backdrop-blur-md border border-slate-200 text-slate-800 text-sm font-medium rounded-2xl pl-11 pr-4 py-3 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button
                    type="submit"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  </button>
                </form>

                {searchResults.length > 0 && (
                  <div className="mt-2 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                    {searchResults.map((res, i) => (
                      <button
                        key={i}
                        onClick={() => selectSearchResult(res)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-sm text-slate-700 transition-colors"
                      >
                        <span className="font-medium line-clamp-1">{res.display_name.split(',')[0]}</span>
                        <span className="block text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                          {res.display_name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Layer switcher */}
              <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5 bg-white/95 backdrop-blur-md rounded-2xl p-1.5 shadow-lg border border-slate-100">
                {Object.values(MAP_LAYERS).map((opt) => {
                  const Icon = opt.icon;
                  const active = activeLayer === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      title={opt.label}
                      onClick={() => setActiveLayer(opt.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-bold transition-all ${
                        active
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon size={14} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Locate me */}
              <button
                type="button"
                onClick={goToMyLocation}
                className="absolute bottom-14 right-3 z-[1000] p-2.5 bg-white rounded-xl shadow-lg border border-slate-100 text-blue-600 hover:bg-blue-50 transition-all"
                title="ไปยังตำแหน่งปัจจุบัน"
              >
                <LocateFixed size={18} />
              </button>

              {/* Center pin */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[1000] pointer-events-none flex flex-col items-center">
                <div className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full mb-1 shadow-lg uppercase tracking-widest border border-white/20">
                  จุดเกิดเหตุ
                </div>
                <MapPin
                  size={46}
                  className="text-rose-500 drop-shadow-[0_6px_6px_rgba(0,0,0,0.6)]"
                  fill="currentColor"
                />
                <div className="w-2.5 h-1.5 bg-black/40 rounded-[100%] mt-[-4px] blur-[1px]" />
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/80 text-white text-xs font-bold px-5 py-2.5 rounded-full backdrop-blur-md pointer-events-none whitespace-nowrap shadow-xl border border-white/10">
                ซูมเข้าใกล้ + เลื่อนแผนที่เพื่อกำหนดตำแหน่ง
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-paper shrink-0 border-t border-line">
          <div className="mb-4 bg-ink rounded-xl px-4 py-3.5 flex items-center justify-between text-paper">
            <div className="flex items-center gap-3 min-w-0">
              <Crosshair size={18} className="text-mark shrink-0" />
              <span className="font-mono font-semibold text-[14px] tracking-wider truncate">
                {centerPos[0].toFixed(7)}, {centerPos[1].toFixed(7)}
              </span>
            </div>
            {locError && (
              <span className="text-[10px] font-semibold text-mark bg-mark/15 px-2 py-1 rounded-md flex items-center gap-1 shrink-0 ml-2">
                <AlertCircle size={12} /> ไม่พบ GPS
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3.5 rounded-xl border border-line text-asphalt/60 font-semibold text-sm hover:bg-mist transition-all"
            >
              ยกเลิก
            </button>
            <button
              onClick={() => onConfirm(centerPos[0], centerPos[1])}
              className="flex-[2] py-3.5 rounded-xl font-display text-sm transition-all flex items-center justify-center gap-2 bg-ink hover:bg-ink-soft text-paper"
            >
              <Navigation size={18} /> ยืนยันตำแหน่งและส่ง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
