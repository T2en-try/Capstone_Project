import React, { useEffect, useState } from "react";

import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
  ScaleControl,
  ZoomControl,
  CircleMarker,
  Polyline,
} from "react-leaflet";

import {
  MapPin,
  X,
  LocateFixed,
  AlertCircle,
  Navigation,
  Crosshair,
  Search,
  Loader2,
  Satellite,
  Map as MapIcon,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import { snapToRoad } from "../../services/mapService";

import "leaflet/dist/leaflet.css";

/* ============================================================
   Default center
============================================================ */

const DEFAULT_CENTER = [14.9798, 102.0977];

/* ============================================================
   Map layers
============================================================ */

const MAP_LAYERS = {
  hybrid: {
    id: "hybrid",
    label: "ผสม",
    icon: Layers,

    base: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "&copy; Esri",
      maxZoom: 22,
      maxNativeZoom: 19,
    },

    overlay: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      maxZoom: 22,
      maxNativeZoom: 19,
    },
  },

  satellite: {
    id: "satellite",
    label: "ดาวเทียม",
    icon: Satellite,

    base: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "&copy; Esri",
      maxZoom: 22,
      maxNativeZoom: 19,
    },
  },

  streets: {
    id: "streets",
    label: "ถนน",
    icon: MapIcon,

    base: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "&copy; OpenStreetMap",
      maxZoom: 22,
      maxNativeZoom: 19,
    },
  },
};

/* ============================================================
   Fly to location
============================================================ */

function FlyToLocation({ position, zoom = 19 }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;

    map.flyTo(position, zoom, {
      duration: 1,
    });
  }, [position, zoom, map]);

  return null;
}

/* ============================================================
   Map center handler
============================================================ */

function CenterCrosshairHandler({ onCenterChanged }) {
  useMapEvents({
    moveend: (event) => {
      const center = event.target.getCenter();

      onCenterChanged([center.lat, center.lng]);
    },
  });

  return null;
}

/* ============================================================
   Map resize
============================================================ */

function MapInvalidateSize() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

/* ============================================================
   GPS quality
   UI ONLY
============================================================ */

function getGpsQuality(accuracy) {
  if (accuracy == null) {
    return {
      type: "unknown",
      label: "ยังไม่ได้ตรวจสอบตำแหน่ง GPS",
      className:
        "border-slate-200 bg-slate-50 text-slate-600",
    };
  }

  if (accuracy <= 20) {
    return {
      type: "good",
      label: "ตำแหน่ง GPS อยู่ในระดับที่ดี",
      className:
        "border-blue-100 bg-blue-50 text-blue-700",
    };
  }

  if (accuracy <= 50) {
    return {
      type: "warning",
      label: "ควรตรวจสอบตำแหน่งบนแผนที่",
      className:
        "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    type: "bad",
    label: "GPS อาจคลาดเคลื่อน",
    className:
      "border-amber-200 bg-amber-50 text-amber-700",
  };
}

/* ============================================================
   Snap quality
   UI ONLY
============================================================ */

function getSnapQuality(distance) {
  if (distance == null) {
    return null;
  }

  if (distance <= 30) {
    return {
      type: "accepted",
      label: "ปรับตำแหน่งให้ตรงกับแนวถนนแล้ว",
      icon: CheckCircle2,
      className:
        "border-blue-100 bg-blue-50 text-blue-700",
    };
  }

  if (distance <= 50) {
    return {
      type: "warning",
      label: "ปรับตำแหน่งตามแนวถนนแล้ว",
      icon: AlertTriangle,
      className:
        "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    type: "far",
    label: "พบถนนใกล้เคียง แต่ควรตรวจสอบตำแหน่ง",
    icon: AlertTriangle,
    className:
      "border-amber-200 bg-amber-50 text-amber-700",
  };
}

/* ============================================================
   Main component
============================================================ */

export default function GpsPinModal({
  pendingFile,
  onConfirm,
  onCancel,
}) {
  /* ==========================================================
     Location
  ========================================================== */

  const [devicePos, setDevicePos] = useState(null);

  const [centerPos, setCenterPos] =
    useState(DEFAULT_CENTER);

  const [flyToPos, setFlyToPos] = useState(null);

  const [flyZoom, setFlyZoom] = useState(19);

  const [locating, setLocating] = useState(true);

  const [locError, setLocError] = useState(false);

  /* ==========================================================
     Map
  ========================================================== */

  const [activeLayer, setActiveLayer] =
    useState("hybrid");

  /* ==========================================================
     GPS
  ========================================================== */

  const [gpsAccuracy, setGpsAccuracy] =
    useState(null);

  /* ==========================================================
     Snap
  ========================================================== */

  const [snappedPos, setSnappedPos] =
    useState(null);

  const [snapDistance, setSnapDistance] =
    useState(null);

  const [snapDecision, setSnapDecision] =
    useState(null);

  const [snapLoading, setSnapLoading] =
    useState(false);

  const [snapRoadName, setSnapRoadName] =
    useState(null);

  const [snapError, setSnapError] =
    useState("");

  /* ==========================================================
     Search
  ========================================================== */

  const [searchQuery, setSearchQuery] =
    useState("");

  const [searchResults, setSearchResults] =
    useState([]);

  const [isSearching, setIsSearching] =
    useState(false);

  /* ==========================================================
     GPS status
  ========================================================== */

  const gpsQuality =
    getGpsQuality(gpsAccuracy);

  /*
   * GPS > 50m เป็น warning เท่านั้น
   */
  const gpsTooWeak =
    gpsAccuracy != null &&
    gpsAccuracy > 50;

  /* ==========================================================
     Snap status
  ========================================================== */

  const snapQuality =
    getSnapQuality(snapDistance);

  /* ==========================================================
     Clear snap
  ========================================================== */

  const clearSnapResult = () => {
    setSnappedPos(null);
    setSnapDistance(null);
    setSnapDecision(null);
    setSnapRoadName(null);
    setSnapError("");
  };

  /* ==========================================================
     Get current location
  ========================================================== */

  const getCurrentLocation = (
    timeout = 10000
  ) => {
    if (!navigator.geolocation) {
      setLocating(false);
      setLocError(true);

      setSnapError(
        "เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง"
      );

      return;
    }

    setLocating(true);
    setLocError(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude =
          position.coords.latitude;

        const longitude =
          position.coords.longitude;

        const accuracy =
          position.coords.accuracy;

        const coordinate = [
          latitude,
          longitude,
        ];

        setDevicePos(coordinate);
        setCenterPos(coordinate);
        setFlyToPos(coordinate);
        setFlyZoom(19);
        setGpsAccuracy(accuracy);

        clearSnapResult();

        setLocating(false);
      },

      (error) => {
        console.error(
          "Geolocation error:",
          error
        );

        setLocating(false);
        setLocError(true);

        setSnapError(
          "ไม่สามารถอ่านตำแหน่ง GPS อัตโนมัติได้ คุณยังสามารถเลื่อนแผนที่เพื่อเลือกตำแหน่งเองได้"
        );
      },

      {
        enableHighAccuracy: true,
        timeout,
        maximumAge: 0,
      }
    );
  };

  /* ==========================================================
     Initial location
  ========================================================== */

  useEffect(() => {
    getCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ==========================================================
     Map layer
  ========================================================== */

  const layer =
    MAP_LAYERS[activeLayer];

  /* ==========================================================
     Search
  ========================================================== */

  const handleSearch = async (event) => {
    event.preventDefault();

    const query =
      searchQuery.trim();

    if (!query) return;

    setIsSearching(true);

    try {
      const url =
        "https://nominatim.openstreetmap.org/search" +
        `?format=json` +
        `&q=${encodeURIComponent(query)}` +
        `&countrycodes=th` +
        `&limit=8` +
        `&addressdetails=1`;

      const response =
        await fetch(url);

      if (!response.ok) {
        throw new Error(
          "ค้นหาสถานที่ไม่สำเร็จ"
        );
      }

      const data =
        await response.json();

      setSearchResults(data);
    } catch (error) {
      console.error(
        "Search failed:",
        error
      );

      setSnapError(
        "ไม่สามารถค้นหาสถานที่ได้"
      );
    } finally {
      setIsSearching(false);
    }
  };

  /* ==========================================================
     Select search result
  ========================================================== */

  const selectSearchResult = (
    result
  ) => {
    const latitude =
      Number(result.lat);

    const longitude =
      Number(result.lon);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    const position = [
      latitude,
      longitude,
    ];

    setCenterPos(position);
    setFlyToPos(position);
    setFlyZoom(19);

    clearSnapResult();

    setSearchResults([]);
    setSearchQuery("");
  };

  /* ==========================================================
     Go to current location
  ========================================================== */

  const goToMyLocation = () => {
    getCurrentLocation(10000);
  };

  /* ==========================================================
     Map center changed
  ========================================================== */

  const handleCenterChanged = (
    position
  ) => {
    setCenterPos(position);

    setSnappedPos(null);
    setSnapDistance(null);
    setSnapDecision(null);
    setSnapRoadName(null);

    setSnapError("");
  };

  /* ==========================================================
     Snap to road
     LOGIC เดิม
  ========================================================== */

  const handleSnapToRoad = async () => {
    if (!centerPos) {
      setSnapError(
        "กรุณาเลือกตำแหน่งบนแผนที่"
      );

      return;
    }

    setSnapLoading(true);
    setSnapError("");

    setSnappedPos(null);
    setSnapDistance(null);
    setSnapDecision(null);
    setSnapRoadName(null);

    try {
      const result =
        await snapToRoad(
          centerPos[0],
          centerPos[1],
          gpsAccuracy
        );

      console.log(
        "Snap-to-Road result:",
        result
      );

      if (
        result?.decision ===
        "gps_rejected"
      ) {
        setSnapError(
          "GPS มีความคลาดเคลื่อนสูง แต่คุณยังสามารถส่งรายงานได้"
        );
      }

      if (!result?.snapped) {
        setSnappedPos(null);
        setSnapDistance(null);
        setSnapDecision("manual");
        setSnapRoadName(null);

        setSnapError(
          "ไม่พบแนวถนนใกล้ตำแหน่งนี้ คุณสามารถใช้ตำแหน่งที่เลือกส่งรายงานได้"
        );

        return;
      }

      const snappedLat =
        Number(
          result.snapped.latitude
        );

      const snappedLng =
        Number(
          result.snapped.longitude
        );

      if (
        !Number.isFinite(
          snappedLat
        ) ||
        !Number.isFinite(
          snappedLng
        )
      ) {
        setSnappedPos(null);
        setSnapDistance(null);
        setSnapDecision("manual");

        setSnapError(
          "ไม่สามารถอ่านตำแหน่งถนนได้ ระบบจะใช้ตำแหน่งที่คุณเลือก"
        );

        return;
      }

      const distance =
        result.distance_meters == null
          ? null
          : Number(
              result.distance_meters
            );

      const snapped = [
        snappedLat,
        snappedLng,
      ];

      setSnappedPos(snapped);
      setSnapDistance(distance);

      setSnapRoadName(
        result.road_name || null
      );

      if (distance == null) {
        setSnapDecision(
          "accepted"
        );
      } else if (distance <= 30) {
        setSnapDecision(
          "accepted"
        );
      } else if (distance <= 50) {
        setSnapDecision(
          "warning"
        );
      } else {
        setSnapDecision(
          "far"
        );
      }

      if (
        distance != null &&
        distance > 50
      ) {
        setSnapError(
          `จุดที่เลือกอยู่ห่างจากถนนประมาณ ${distance.toFixed(
            1
          )} เมตร กรุณาตรวจสอบตำแหน่งอีกครั้ง`
        );
      } else if (
        gpsTooWeak
      ) {
        setSnapError(
          `GPS มีความคลาดเคลื่อนประมาณ ${gpsAccuracy.toFixed(
            1
          )} เมตร กรุณาตรวจสอบหมุดบนแผนที่`
        );
      } else {
        setSnapError("");
      }
    } catch (error) {
      console.error(
        "Snap-to-Road failed:",
        error
      );

      setSnappedPos(null);
      setSnapDistance(null);
      setSnapDecision("manual");
      setSnapRoadName(null);

      setSnapError(
        "ไม่สามารถตรวจสอบแนวถนนได้ คุณยังสามารถใช้ตำแหน่งที่เลือกส่งรายงานได้"
      );
    } finally {
      setSnapLoading(false);
    }
  };

  /* ==========================================================
     Confirm
     LOGIC เดิม
  ========================================================== */

  const handleConfirm = () => {
    if (snappedPos) {
      if (
        gpsAccuracy != null &&
        gpsAccuracy > 50
      ) {
        console.warn(
          `GPS accuracy ต่ำ: ${gpsAccuracy.toFixed(
            1
          )} m`
        );
      }

      if (
        snapDistance != null &&
        snapDistance > 50
      ) {
        console.warn(
          `Snap distance สูง: ${snapDistance.toFixed(
            1
          )} m`
        );
      }

      console.log(
        "Submitting snapped position:",
        snappedPos
      );

      onConfirm(
        snappedPos[0],
        snappedPos[1]
      );

      return;
    }

    if (centerPos) {
      if (
        gpsAccuracy != null &&
        gpsAccuracy > 50
      ) {
        console.warn(
          `GPS accuracy ต่ำ: ${gpsAccuracy.toFixed(
            1
          )} m`
        );
      }

      console.log(
        "Submitting manually selected position:",
        centerPos
      );

      onConfirm(
        centerPos[0],
        centerPos[1]
      );

      return;
    }

    setSnapError(
      "ไม่พบตำแหน่ง กรุณาเลือกตำแหน่งบนแผนที่"
    );
  };

  /* ==========================================================
     Render
  ========================================================== */

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 backdrop-blur-[2px] p-0 sm:p-4">
      <div
        className="
          w-full sm:max-w-2xl
          h-[100dvh] sm:h-auto
          sm:max-h-[90vh]
          bg-white
          sm:rounded-2xl
          overflow-hidden
          flex flex-col
          shadow-2xl
        "
      >
        {/* ====================================================
            Header
        ==================================================== */}

        <div className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <MapPin
                size={20}
                className="text-blue-600"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] sm:text-[17px] font-bold text-slate-800">
                ระบุตำแหน่งจุดเกิดเหตุ
              </h2>

              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                เลื่อนแผนที่ให้หมุดอยู่ตรงตำแหน่งที่พบปัญหา
              </p>
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="
                w-9 h-9
                rounded-lg
                flex items-center justify-center
                text-slate-400
                hover:text-slate-700
                hover:bg-slate-100
                transition
                shrink-0
              "
              aria-label="ปิด"
            >
              <X size={19} />
            </button>
          </div>

          {pendingFile && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] uppercase tracking-wide text-slate-400">
                ไฟล์ภาพ
              </span>

              <span className="text-[11px] text-slate-600 truncate flex-1">
                {pendingFile.name}
              </span>
            </div>
          )}
        </div>

        {/* ====================================================
            Scrollable Body (GPS notice + Map + Info)
        ==================================================== */}

        <div className="flex-1 min-h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>

        {/* ====================================================
            GPS notice
        ==================================================== */}

        <div className="shrink-0 px-4 sm:px-5 py-2.5 border-b border-slate-200">
          <div
            className={`
              flex items-center gap-2.5
              rounded-lg
              border
              px-3 py-2
              ${gpsQuality.className}
            `}
          >
            <LocateFixed
              size={15}
              className="shrink-0"
            />

            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold">
                {gpsQuality.label}
              </div>

              {gpsTooWeak && (
                <div className="text-[10px] mt-0.5 opacity-90">
                  กรุณาตรวจสอบหมุดบนแผนที่ก่อนส่งรายงาน
                </div>
              )}

              {locError && (
                <div className="text-[10px] mt-0.5">
                  สามารถเลือกตำแหน่งด้วยตัวเองได้
                </div>
              )}
            </div>

            {gpsAccuracy != null && (
              <span className="font-mono text-[11px] font-semibold shrink-0">
                ±{gpsAccuracy.toFixed(0)} m
              </span>
            )}
          </div>
        </div>

        {/* ====================================================
            Map
        ==================================================== */}

        <div
          className="relative shrink-0"
          style={{
            height:
              window.innerWidth >= 640
                ? "clamp(300px, 45vh, 420px)"
                : "clamp(240px, 35vh, 320px)",
          }}
        >
          {locating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 gap-2">
              <LocateFixed
                size={28}
                className="text-blue-600 animate-pulse"
              />

              <p className="text-sm text-slate-500">
                กำลังค้นหาตำแหน่ง...
              </p>
            </div>
          ) : (
            <>
              <MapContainer
                center={
                  devicePos ||
                  DEFAULT_CENTER
                }
                zoom={
                  locError
                    ? 12
                    : 19
                }
                maxZoom={22}
                minZoom={5}
                style={{
                  height: "100%",
                  width: "100%",
                  minHeight: 0,
                }}
                zoomControl={false}
              >
                <TileLayer
                  key={`base-${activeLayer}`}
                  attribution={
                    layer.base
                      .attribution
                  }
                  url={
                    layer.base.url
                  }
                  maxZoom={
                    layer.base.maxZoom
                  }
                  maxNativeZoom={
                    layer.base
                      .maxNativeZoom
                  }
                />

                {layer.overlay && (
                  <TileLayer
                    key={`overlay-${activeLayer}`}
                    url={
                      layer.overlay.url
                    }
                    maxZoom={
                      layer.overlay
                        .maxZoom
                    }
                    maxNativeZoom={
                      layer.overlay
                        .maxNativeZoom
                    }
                    opacity={0.9}
                  />
                )}

                <ZoomControl position="bottomright" />

                <ScaleControl
                  position="bottomleft"
                  imperial={false}
                />

                <CenterCrosshairHandler
                  onCenterChanged={
                    handleCenterChanged
                  }
                />

                {flyToPos && (
                  <FlyToLocation
                    position={
                      flyToPos
                    }
                    zoom={flyZoom}
                  />
                )}

                <MapInvalidateSize />

                {/* User selected point */}
                <CircleMarker
                  center={centerPos}
                  radius={6}
                  pathOptions={{
                    color: "#2563EB",
                    fillColor:
                      "#2563EB",
                    fillOpacity: 1,
                    weight: 3,
                  }}
                />

                {/* Snapped point */}
                {snappedPos && (
                  <>
                    <CircleMarker
                      center={
                        snappedPos
                      }
                      radius={8}
                      pathOptions={{
                        color:
                          snapDecision ===
                          "accepted"
                            ? "#2563EB"
                            : "#F59E0B",
                        fillColor:
                          snapDecision ===
                          "accepted"
                            ? "#2563EB"
                            : "#F59E0B",
                        fillOpacity: 1,
                        weight: 3,
                      }}
                    />

                    <Polyline
                      positions={[
                        centerPos,
                        snappedPos,
                      ]}
                      pathOptions={{
                        color:
                          "#64748B",
                        weight: 2,
                        dashArray:
                          "5 6",
                      }}
                    />
                  </>
                )}
              </MapContainer>

              {/* ==================================================
                  Search
              ================================================== */}

              <div className="absolute top-3 left-3 right-14 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[88%] sm:max-w-[370px] z-[1000]">
                <form
                  onSubmit={
                    handleSearch
                  }
                  className="relative"
                >
                  <input
                    type="text"
                    value={
                      searchQuery
                    }
                    onChange={(e) =>
                      setSearchQuery(
                        e.target.value
                      )
                    }
                    placeholder="ค้นหาถนน สถานที่ หรือหมู่บ้าน"
                    className="
                      w-full
                      bg-white
                      border border-slate-200
                      text-slate-700
                      text-xs sm:text-sm
                      rounded-xl
                      pl-10 pr-3
                      py-2.5
                      shadow-md
                      outline-none
                      focus:border-blue-400
                      focus:ring-2
                      focus:ring-blue-100
                    "
                  />

                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {isSearching ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Search
                        size={16}
                      />
                    )}
                  </div>
                </form>

                {searchResults.length >
                  0 && (
                  <div className="mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                    {searchResults.map(
                      (
                        result,
                        index
                      ) => (
                        <button
                          key={
                            index
                          }
                          type="button"
                          onClick={() =>
                            selectSearchResult(
                              result
                            )
                          }
                          className="
                            w-full
                            text-left
                            px-3
                            py-2.5
                            hover:bg-slate-50
                            border-b
                            border-slate-100
                            last:border-0
                          "
                        >
                          <div className="text-xs font-medium text-slate-700 line-clamp-1">
                            {
                              result.display_name?.split(
                                ","
                              )[0]
                            }
                          </div>

                          <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                            {
                              result.display_name
                            }
                          </div>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* ==================================================
                  Layer switch
              ================================================== */}

              <div className="absolute top-14 sm:top-3 right-3 z-[1000] bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                {Object.values(
                  MAP_LAYERS
                ).map(
                  (option) => {
                    const Icon =
                      option.icon;

                    const active =
                      activeLayer ===
                      option.id;

                    return (
                      <button
                        key={
                          option.id
                        }
                        type="button"
                        onClick={() =>
                          setActiveLayer(
                            option.id
                          )
                        }
                        className={`
                          flex
                          items-center
                          gap-1.5
                          w-full
                          px-2.5
                          py-2
                          text-[10px]
                          font-semibold
                          transition
                          ${
                            active
                              ? "bg-blue-600 text-white"
                              : "text-slate-600 hover:bg-slate-50"
                          }
                        `}
                      >
                        <Icon
                          size={13}
                        />

                        {
                          option.label
                        }
                      </button>
                    );
                  }
                )}
              </div>

              {/* ==================================================
                  My location
              ================================================== */}

              <button
                type="button"
                onClick={
                  goToMyLocation
                }
                className="
                  absolute
                  bottom-12
                  right-3
                  z-[1000]
                  w-9 h-9
                  bg-white
                  rounded-lg
                  shadow-md
                  border border-slate-200
                  text-blue-600
                  hover:bg-blue-50
                  transition
                  flex items-center
                  justify-center
                "
                title="ใช้ตำแหน่งปัจจุบัน"
              >
                <LocateFixed
                  size={17}
                />
              </button>

              {/* ==================================================
                  Center marker
              ================================================== */}

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[1000] pointer-events-none flex flex-col items-center">
                <div className="bg-blue-600 text-white text-[9px] font-semibold px-2 py-1 rounded-full mb-1 shadow-md whitespace-nowrap">
                  จุดเกิดเหตุ
                </div>

                <MapPin
                  size={40}
                  className="text-rose-500 drop-shadow-lg"
                  fill="currentColor"
                />

                <div className="w-2.5 h-1.5 bg-black/30 rounded-full -mt-1" />
              </div>

              {/* ==================================================
                  Map status
              ================================================== */}

              {snappedPos && (
                <div className="absolute left-3 bottom-3 z-[1000] bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-md px-3 py-2">
                  <div className="flex items-center gap-2 text-[10px] text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />

                    จุดที่เลือก
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-600 mt-1">
                    <span
                      className={`
                        w-2.5 h-2.5 rounded-full
                        ${
                          snapDecision ===
                          "accepted"
                            ? "bg-blue-600"
                            : "bg-amber-500"
                        }
                      `}
                    />

                    ตำแหน่งถนน
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ====================================================
            Information
        ==================================================== */}

        <div className="px-4 sm:px-5 pt-3">
          {/* Snap warning */}
          {snapError && (
            <div
              className="
                mb-2.5
                rounded-lg
                border border-amber-200
                bg-amber-50
                text-amber-700
                px-3
                py-2.5
              "
            >
              <div className="flex items-start gap-2">
                <AlertCircle
                  size={15}
                  className="shrink-0 mt-0.5"
                />

                <div className="text-[11px] leading-relaxed">
                  {snapError}
                </div>
              </div>
            </div>
          )}

          {/* No snap */}
          {!snappedPos ? (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <Crosshair
                size={16}
                className="text-blue-600 shrink-0 mt-0.5"
              />

              <div>
                <div className="text-xs font-semibold text-slate-700">
                  ตำแหน่งที่เลือก
                </div>

                <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  ตรวจสอบหมุดให้ตรงกับจุดเกิดเหตุ
                  แล้วสามารถส่งรายงานได้ทันที
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`
                rounded-lg
                border
                px-3
                py-2.5
                ${
                  snapQuality?.className ||
                  "border-slate-200 bg-slate-50 text-slate-700"
                }
              `}
            >
              <div className="flex items-start gap-2.5">
                {snapQuality?.icon &&
                  React.createElement(
                    snapQuality.icon,
                    {
                      size: 17,
                      className:
                        "shrink-0 mt-0.5",
                    }
                  )}

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold">
                    {snapQuality?.label ||
                      "ตรวจสอบตำแหน่งแล้ว"}
                  </div>

                  {snapRoadName && (
                    <div className="text-[10px] mt-0.5 opacity-80">
                      ถนน{" "}
                      <strong>
                        {
                          snapRoadName
                        }
                      </strong>
                    </div>
                  )}

                  {snapDistance !=
                    null && (
                    <div className="text-[10px] mt-0.5 opacity-75">
                      ระบบปรับตำแหน่งจากจุดเดิมประมาณ{" "}
                      <strong className="font-mono">
                        {snapDistance.toFixed(
                          1
                        )}{" "}
                        ม.
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        </div>{/* end scrollable body */}

        {/* ====================================================
            Footer (sticky bottom)
        ==================================================== */}

        <div className="shrink-0 border-t border-slate-100 bg-white p-3 sm:px-5 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* ==================================================
              Snap button
          ================================================== */}

          <button
            type="button"
            onClick={
              handleSnapToRoad
            }
            disabled={
              snapLoading ||
              !centerPos
            }
            className="
              w-full
              py-2.5
              rounded-lg
              bg-blue-600
              hover:bg-blue-700
              text-white
              font-semibold
              text-xs sm:text-sm
              disabled:opacity-40
              disabled:cursor-not-allowed
              transition
              flex items-center
              justify-center
              gap-2
            "
          >
            {snapLoading ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />

                กำลังตรวจสอบตำแหน่ง...
              </>
            ) : (
              <>
                <Navigation
                  size={16}
                />

                ตรวจสอบตำแหน่งกับถนน
              </>
            )}
          </button>

          {/* ==================================================
              GPS retry
          ================================================== */}

          {gpsTooWeak && (
            <button
              type="button"
              onClick={() =>
                getCurrentLocation(
                  10000
                )
              }
              disabled={locating}
              className="
                w-full
                mt-2
                py-2
                rounded-lg
                border border-amber-300
                bg-white
                text-amber-700
                font-semibold
                text-xs
                hover:bg-amber-50
                disabled:opacity-50
                transition
                flex items-center
                justify-center
                gap-2
              "
            >
              {locating ? (
                <>
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />

                  กำลังค้นหาตำแหน่ง...
                </>
              ) : (
                <>
                  <LocateFixed
                    size={15}
                  />

                  ใช้ตำแหน่งปัจจุบันอีกครั้ง
                </>
              )}
            </button>
          )}

          {/* ==================================================
              Action buttons
          ================================================== */}

          <div className="flex gap-2.5 mt-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="
                flex-1
                py-2.5
                rounded-lg
                border border-slate-200
                bg-white
                text-slate-600
                font-semibold
                text-xs sm:text-sm
                hover:bg-slate-50
                transition
              "
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={
                handleConfirm
              }
              disabled={!centerPos}
              className="
                flex-[2]
                py-2.5
                rounded-lg
                bg-blue-600
                hover:bg-blue-700
                text-white
                font-semibold
                text-xs sm:text-sm
                disabled:opacity-35
                disabled:cursor-not-allowed
                transition
                flex items-center
                justify-center
                gap-2
              "
            >
              <CheckCircle2
                size={16}
              />

              {snappedPos
                ? "ยืนยันตำแหน่งและส่งรายงาน"
                : "ยืนยันตำแหน่งและส่งรายงาน"}
            </button>
          </div>

          {/* ==================================================
              Hint
          ================================================== */}

          <div className="mt-2 text-center text-[9px] text-slate-400">
            {snappedPos
              ? "ระบบจะใช้ตำแหน่งถนนที่ตรวจสอบแล้วในการส่งรายงาน"
              : "คุณสามารถส่งตำแหน่งที่เลือกได้ทันที หรือเลือกตรวจสอบกับถนนก่อน"}
          </div>
        </div>
      </div>
    </div>
  );
}