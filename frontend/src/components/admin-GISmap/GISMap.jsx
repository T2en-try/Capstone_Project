import { useMemo } from "react";
import { MapContainer, TileLayer } from "react-leaflet";

import MarkerLayer from "./MarkerLayer";
import RoadLayer from "./RoadLayer";
import HeatmapLayer from "./HeatmapLayer";
import GridLayer from "./GridLayer";

import reportMock from "../../mock/reportMock";

import "leaflet/dist/leaflet.css";

export default function GISMap({
    setSelectedRoad,
    layers,
    filters,
    gridDays = 7,
}) {

    const filteredReports = useMemo(() => {

        return reportMock.filter((item) => {

            const keywordMatch =
                item.roadName
                    .toLowerCase()
                    .includes(filters.keyword.toLowerCase());

            const severityMatch =
                filters.severity === "All" ||
                item.severity === filters.severity;

            const statusMatch =
                filters.status === "All" ||
                item.status === filters.status;

            return (
                keywordMatch &&
                severityMatch &&
                statusMatch
            );

        });

    }, [filters]);

    return (

        <MapContainer
            center={[14.8781, 102.0156]}
            zoom={13}
            style={{
                height: "650px",
                width: "100%",
            }}
        >

            <TileLayer
                attribution="OpenStreetMap"
                url={
                    layers.satellite
                        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                }
            />

            {/* CASP Grid Layer — แสดง Priority Grid */}
            <GridLayer visible={!!layers.grid} days={gridDays} />

            {
                layers.road && (
                    <RoadLayer
                        reports={filteredReports}
                        onSelectRoad={setSelectedRoad}
                    />
                )
            }

            {
                layers.heatmap && (
                    <HeatmapLayer
                        reports={filteredReports}
                    />
                )
            }

            {
                layers.marker && (
                    <MarkerLayer
                        reports={filteredReports}
                    />
                )
            }

        </MapContainer>

    );

}