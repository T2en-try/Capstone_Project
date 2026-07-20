import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Flame, AlertTriangle, Layers, Maximize2, Minimize2, X } from 'lucide-react';

const DEFAULT_CENTER = [14.9798, 102.0977];

const DAMAGE_META = {
  critical: { label: 'วิกฤต', color: '#e11d48', fill: '#fb7185' },
  warning: { label: 'เตือนภัย', color: '#ea580c', fill: '#fb923c' },
  moderate: { label: 'ปานกลาง', color: '#ca8a04', fill: '#facc15' },
  good: { label: 'ปกติ', color: '#059669', fill: '#34d399' },
  unknown: { label: 'ไม่ระบุ', color: '#64748b', fill: '#94a3b8' },
};

/** leaflet.heat คาดหวัง global L — ต้องตั้งก่อน dynamic import */
let heatPluginPromise = null;
function loadHeatPlugin() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (typeof L.heatLayer === 'function') return Promise.resolve(true);
  if (!heatPluginPromise) {
    window.L = L;
    heatPluginPromise = import('leaflet.heat')
      .then(() => typeof L.heatLayer === 'function' || typeof window.L?.heatLayer === 'function')
      .catch((err) => {
        console.error('Failed to load leaflet.heat:', err);
        return false;
      });
  }
  return heatPluginPromise;
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points?.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.18), { maxZoom: 14, animate: true });
    }
  }, [points, map]);
  return null;
}

function InvalidateOnResize({ expanded }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map, expanded]);
  return null;
}

function HeatLayer({ points, intensityMode }) {
  const map = useMap();

  useEffect(() => {
    if (!points?.length) return undefined;
    let layer = null;
    let cancelled = false;

    loadHeatPlugin().then((ok) => {
      if (cancelled || !ok) return;
      const heatFn = L.heatLayer || window.L?.heatLayer;
      if (typeof heatFn !== 'function') return;

      const latlngs = points.map((p) => {
        let intensity = 0.6;
        if (intensityMode === 'severity') {
          intensity = Math.min(
            1,
            0.25 + (p.fusion_score || 0) * 0.7 + (p.severity_score || 0) / 10
          );
        }
        return [p.latitude, p.longitude, intensity];
      });

      layer = heatFn(latlngs, {
        radius: intensityMode === 'density' ? 28 : 22,
        blur: intensityMode === 'density' ? 22 : 18,
        maxZoom: 17,
        max: 1.0,
        minOpacity: 0.35,
        gradient:
          intensityMode === 'density'
            ? { 0.2: '#22d3ee', 0.45: '#3b82f6', 0.7: '#a855f7', 0.9: '#f43f5e' }
            : { 0.2: '#34d399', 0.45: '#facc15', 0.7: '#fb923c', 0.9: '#e11d48' },
      });
      layer.addTo(map);
    });

    return () => {
      cancelled = true;
      if (layer) {
        try {
          map.removeLayer(layer);
        } catch {
          /* map may already be gone */
        }
      }
    };
  }, [map, points, intensityMode]);

  return null;
}

function MapBody({ points, loading, mode, expanded, mapKey }) {
  const center = useMemo(() => {
    if (!points.length) return DEFAULT_CENTER;
    const lat = points.reduce((s, p) => s + p.latitude, 0) / points.length;
    const lon = points.reduce((s, p) => s + p.longitude, 0) / points.length;
    return [lat, lon];
  }, [points]);

  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, moderate: 0, good: 0, unknown: 0 };
    points.forEach((p) => {
      const key = DAMAGE_META[p.damage_level] ? p.damage_level : 'unknown';
      c[key] += 1;
    });
    return c;
  }, [points]);

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">กำลังโหลดแผนที่...</p>
      </div>
    );
  }

  if (!points.length) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-50">
        <Flame size={expanded ? 28 : 20} className="text-slate-300" />
        <p className="text-xs text-slate-400">ยังไม่มีจุดพิกัด</p>
      </div>
    );
  }

  return (
    <>
      <MapContainer
        key={mapKey}
        center={center}
        zoom={12}
        maxZoom={18}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={expanded}
        dragging={expanded}
        doubleClickZoom={expanded}
        zoomControl={expanded}
      >
        <TileLayer
          attribution="&copy; OSM &copy; CARTO"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />
        <FitBounds points={points} />
        <InvalidateOnResize expanded={expanded} />

        {mode === 'density' && <HeatLayer points={points} intensityMode="density" />}

        {mode === 'severity' && (
          <>
            <HeatLayer points={points} intensityMode="severity" />
            {points.map((p) => {
              const meta = DAMAGE_META[p.damage_level] || DAMAGE_META.unknown;
              return (
                <CircleMarker
                  key={p.id}
                  center={[p.latitude, p.longitude]}
                  radius={expanded ? 8 : 5}
                  pathOptions={{
                    color: meta.color,
                    fillColor: meta.fill,
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                >
                  {expanded && (
                    <Popup>
                      <div className="text-xs min-w-[160px]">
                        <p className="font-bold text-slate-800 mb-1">
                          {p.road_name || 'ไม่ระบุชื่อถนน'}
                        </p>
                        <p>
                          ระดับ:{' '}
                          <span style={{ color: meta.color }} className="font-bold">
                            {meta.label}
                          </span>
                        </p>
                        <p className="text-slate-500 mt-0.5">
                          Fusion: {(p.fusion_score ?? 0).toFixed(2)} · Severity:{' '}
                          {p.severity_score ?? 0}
                        </p>
                        {p.decision && (
                          <p className="text-slate-500 mt-0.5 line-clamp-2">{p.decision}</p>
                        )}
                      </div>
                    </Popup>
                  )}
                </CircleMarker>
              );
            })}
          </>
        )}
      </MapContainer>

      {expanded && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-100 px-3.5 py-2.5 text-[11px]">
          {mode === 'density' ? (
            <div>
              <p className="font-black text-slate-700 mb-1.5">ความหนาแน่นการแจ้ง</p>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">น้อย</span>
                <div
                  className="h-2.5 w-28 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #22d3ee, #3b82f6, #a855f7, #f43f5e)',
                  }}
                />
                <span className="text-slate-400">มาก</span>
              </div>
              <p className="text-slate-400 mt-1.5">{points.length} จุดบนแผนที่</p>
            </div>
          ) : (
            <div>
              <p className="font-black text-slate-700 mb-1.5">ระดับความเสียหาย (AI)</p>
              <div className="flex flex-col gap-1">
                {Object.entries(DAMAGE_META)
                  .filter(([k]) => k !== 'unknown' || counts.unknown > 0)
                  .map(([key, meta]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: meta.color }}
                      />
                      <span className="text-slate-600">
                        {meta.label} ({counts[key] || 0})
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function HeatmapPanel({ points = [], loading = false }) {
  const [mode, setMode] = useState('density');
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!expanded) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  if (hidden && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        className="fixed bottom-6 right-6 z-[55] flex items-center gap-2 px-4 py-3 rounded-xl bg-ink text-paper text-sm font-semibold hover:bg-ink-soft transition-all border border-ink-soft"
      >
        <Flame size={16} className="text-mark" />
        เปิดแผนที่ Hotspot
      </button>
    );
  }

  const panel = (
    <div
      className={`bg-paper overflow-hidden flex flex-col ${
        expanded
          ? 'w-full max-w-5xl h-[min(85vh,720px)] rounded-2xl border border-line'
          : 'w-[300px] sm:w-[340px] rounded-2xl border border-line'
      }`}
    >
      <div
        className={`flex items-center justify-between gap-2 border-b border-line shrink-0 ${
          expanded ? 'px-5 py-3.5' : 'px-3.5 py-2.5'
        }`}
      >
        <div className="min-w-0">
          <h2 className="text-sm font-display text-ink flex items-center gap-1.5 truncate">
            <Flame size={16} className="text-mark-deep shrink-0" />
            แผนที่ Hotspot
          </h2>
          {expanded && (
            <p className="text-[11px] text-asphalt/55 mt-0.5">
              สลับดูความหนาแน่นการแจ้ง หรือระดับความเสียหายจาก AI
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {expanded && (
            <div className="flex items-center gap-1 bg-mist p-0.5 rounded-xl mr-1">
              <button
                type="button"
                onClick={() => setMode('density')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  mode === 'density'
                    ? 'bg-paper text-ink border border-line'
                    : 'text-asphalt/50 hover:text-ink'
                }`}
              >
                <Layers size={12} />
                ความหนาแน่น
              </button>
              <button
                type="button"
                onClick={() => setMode('severity')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  mode === 'severity'
                    ? 'bg-paper text-ink border border-line'
                    : 'text-asphalt/50 hover:text-ink'
                }`}
              >
                <AlertTriangle size={12} />
                ความเสียหาย
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-2 rounded-xl text-asphalt/50 hover:bg-mist hover:text-ink transition-all"
            title={expanded ? 'ย่อหน้าต่าง' : 'ขยายเต็มจอ'}
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {!expanded && (
            <button
              type="button"
              onClick={() => setHidden(true)}
              className="p-2 rounded-xl text-asphalt/40 hover:bg-mist hover:text-ink transition-all"
              title="ซ่อน"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {!expanded && (
        <div className="px-3 pt-2 flex gap-1">
          <button
            type="button"
            onClick={() => setMode('density')}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
              mode === 'density' ? 'bg-ink/8 text-ink' : 'text-asphalt/45 hover:bg-mist'
            }`}
          >
            ความหนาแน่น
          </button>
          <button
            type="button"
            onClick={() => setMode('severity')}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
              mode === 'severity' ? 'bg-mark/15 text-mark-deep' : 'text-asphalt/45 hover:bg-mist'
            }`}
          >
            ความเสียหาย
          </button>
        </div>
      )}

      <div
        className={`relative flex-1 min-h-0 ${expanded ? '' : 'h-[180px] mt-1'}`}
        style={expanded ? { height: '100%' } : undefined}
      >
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="absolute inset-0 z-[1100] cursor-pointer bg-transparent"
            aria-label="ขยายแผนที่ Hotspot"
          />
        )}
        <MapBody
          points={points}
          loading={loading}
          mode={mode}
          expanded={expanded}
          mapKey={expanded ? 'expanded' : 'compact'}
        />
      </div>

      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="px-3.5 py-2.5 text-[11px] font-semibold text-ink-soft hover:bg-mist border-t border-line transition-colors text-left"
        >
          กดเพื่อขยายดูแผนที่เต็มจอ →
        </button>
      )}
    </div>
  );

  if (expanded) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
        <button
          type="button"
          aria-label="ปิดการขยาย"
          className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        />
        <div className="relative z-10 w-full max-w-5xl">{panel}</div>
      </div>
    );
  }

  return <div className="fixed bottom-6 right-6 z-[55]">{panel}</div>;
}
