import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { markers } from "../../data/markersMap";

// ตัวช่วยแก้ปัญหาแผนที่โหลดไม่เต็มแผ่น
function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

const createIcon = (color) =>
  new L.DivIcon({
    html: `
      <div style="
        background: ${color};
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      "></div>
    `,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  });

const icons = {
  pending: createIcon("#ef4444"),
  working: createIcon("#f59e0b"),
  completed: createIcon("#10b981"),
  forward: createIcon("#3b82f6"),
};

export default function MapView() {
  return (
    // กำหนด h-full w-full ให้ขยายเต็ม h-[450px] / h-[600px] ของ div แม่
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={[14.9799, 102.0977]}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <MapResizeHandler />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {markers &&
          markers.map((marker) => (
            <Marker
              key={marker.id}
              position={marker.position}
              icon={icons[marker.status] || icons.pending}
            >
              <Popup>
                <div className="space-y-1">
                  <h2 className="font-bold">{marker.title}</h2>
                  <p>สถานะ : {marker.status}</p>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}