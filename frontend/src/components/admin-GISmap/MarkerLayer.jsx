import { Marker, Popup, useMap } from "react-leaflet";
import { Button, Tag } from "antd";

import L from "leaflet";

import reportMock from "../../mock/reportMock";

const icon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function MarkerLayer({
    reports = reportMock,
    onSelectRoad,
}) {

    const map = useMap();

    return (
        <>
            {reports.map((report) => (
                <Marker
                    key={report.id}
                    position={[
                        report.lat,
                        report.lng,
                    ]}
                    icon={icon}
                    eventHandlers={{
                        click() {
                            map.flyTo(
                                [report.lat, report.lng],
                                16,
                                {
                                    duration: 0.8,
                                }
                            );
                        },
                    }}
                >
                    <Popup minWidth={250}>
                        <div>

                            <h3
                                style={{
                                    marginBottom: 8,
                                }}
                            >
                                {report.roadName}
                            </h3>

                            <p>
                                <b>รายละเอียด</b>
                            </p>

                            <p>{report.description}</p>

                            <p>

                                <Tag
                                    color={
                                        report.severity === "Critical"
                                            ? "red"
                                            : report.severity === "High"
                                            ? "orange"
                                            : report.severity === "Medium"
                                            ? "gold"
                                            : "green"
                                    }
                                >
                                    {report.severity}
                                </Tag>

                                <Tag
                                    color={
                                        report.status === "Completed"
                                            ? "green"
                                            : report.status === "Processing"
                                            ? "blue"
                                            : "gold"
                                    }
                                >
                                    {report.status}
                                </Tag>

                            </p>

                            <Button
                                type="primary"
                                block
                                onClick={() =>
                                    onSelectRoad?.(report)
                                }
                            >
                                ดูข้อมูลถนน
                            </Button>

                        </div>
                    </Popup>
                </Marker>
            ))}
        </>
    );
}