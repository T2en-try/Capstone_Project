import { Marker, Popup } from "react-leaflet";

import reportMock from "../../mock/reportMock";

export default function MarkerLayer() {
  return (
    <>
      {reportMock.map((report) => (
        <Marker
          key={report.id}
          position={[report.lat, report.lng]}
        >
          <Popup>

            <h3>{report.roadName}</h3>

            <b>Severity</b>

            <p>{report.severity}</p>

            <b>Status</b>

            <p>{report.status}</p>

            <b>Description</b>

            <p>{report.description}</p>

          </Popup>
        </Marker>
      ))}
    </>
  );
}