import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from "react-leaflet";

import L from "leaflet";

import { markers } from "../../data_mockup/markers_map";



const createIcon = (color) =>
  new L.DivIcon({
    html: `
      <div
        style="
          background:${color};
          width:18px;
          height:18px;
          border-radius:50%;
          border:3px solid white;
          box-shadow:0 0 5px rgba(0,0,0,.3);
        ">
      </div>
    `,
    className: "",
  });

const icons = {
  pending: createIcon("#ef4444"),
  working: createIcon("#f59e0b"),
  completed: createIcon("#10b981"),
  forward: createIcon("#3b82f6"),
};

export default function MapView() {
  return (
    <div className="h-[500px] rounded-lg overflow-hidden shadow">

      <MapContainer
        center={[14.9799, 102.0977]}
        zoom={14}
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={icons[marker.status]}
          >
            <Popup>

              <div className="space-y-1">

                <h2 className="font-bold">
                  {marker.title}
                </h2>

                <p>
                  สถานะ :
                  {" "}
                  {marker.status}
                </p>

              </div>

            </Popup>
          </Marker>
        ))}

      </MapContainer>

    </div>
  );
}