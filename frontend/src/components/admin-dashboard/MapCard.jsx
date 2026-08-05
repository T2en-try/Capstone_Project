import { useMemo, useRef, useState } from "react";

import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    ZoomControl,
    ScaleControl,
} from "react-leaflet";

import MarkerClusterGroup from "react-leaflet-cluster";

import { Card, Button, Input, Segmented, Tag, Space, Badge } from "antd";

import {
    SearchOutlined,
    ReloadOutlined,
    FullscreenOutlined,
    EnvironmentOutlined,
    DashboardOutlined,
} from "@ant-design/icons";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

// ===============================
// Leaflet Default Marker Fix
// ===============================

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ===============================
// Severity Marker
// ===============================

const createSeverityMarker = (severity) => {
    const color =
        {
            Critical: "red",

            High: "orange",

            Medium: "yellow",

            Low: "green",
        }[severity] || "blue";

    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,

        shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

        iconSize: [25, 41],

        iconAnchor: [12, 41],

        popupAnchor: [1, -34],

        shadowSize: [41, 41],
    });
};

// ===============================
// Cluster Color
// ===============================

const createClusterIcon = (cluster) => {
    const markers = cluster.getAllChildMarkers();

    const severity = markers.map((item) => item.options.severity);

    let color = "#52c41a";

    if (severity.includes("Critical")) {
        color = "#ff4d4f";
    } else if (severity.includes("High")) {
        color = "#fa8c16";
    } else if (severity.includes("Medium")) {
        color = "#faad14";
    }

    return L.divIcon({
        html: `

        <div

        style="

        background:${color};

        width:45px;

        height:45px;

        border-radius:50%;

        display:flex;

        justify-content:center;

        align-items:center;

        color:white;

        font-weight:bold;

        border:3px solid white;

        box-shadow:0 2px 8px rgba(0,0,0,.3)

        "

        >

        ${cluster.getChildCount()}

        </div>

        `,

        className: "",

        iconSize: [45, 45],
    });
};

export default function MapView({ reports = [] }) {
    const mapRef = useRef(null);

    const [keyword, setKeyword] = useState("");

    const [mapType, setMapType] = useState("map");

    const [showLive, setShowLive] = useState(true);

    // ===============================
    // Search
    // ===============================

    const filteredReports = useMemo(() => {
        if (!keyword) return reports;

        return reports.filter((report) =>
            JSON.stringify(report).toLowerCase().includes(keyword.toLowerCase())
        );
    }, [keyword, reports]);

    // ===============================
    // Statistics
    // ===============================

    const statistics = useMemo(() => {
        return {
            total: filteredReports.length,

            critical: filteredReports.filter((r) => r.severity === "Critical")
                .length,

            high: filteredReports.filter((r) => r.severity === "High").length,

            medium: filteredReports.filter((r) => r.severity === "Medium")
                .length,

            low: filteredReports.filter((r) => r.severity === "Low").length,
        };
    }, [filteredReports]);

    const tileUrl =
        mapType === "map"
            ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

    const resetMap = () => {
        mapRef.current?.flyTo(
            [14.9799, 102.0977],

            14
        );
    };

    const fullscreen = () => {
        document

            .querySelector(".leaflet-container")

            ?.requestFullscreen();
    };

    const severityColor = (severity) => {
        return (
            {
                Critical: "red",

                High: "orange",

                Medium: "gold",

                Low: "green",
            }[severity] || "blue"
        );
    };

    return (
        <Card
            style={{
                borderRadius: 12,
            }}
            bodyStyle={{
                padding: 0,
            }}
        >
            <div
                style={{
                    position: "relative",

                    height: 650,
                }}
            >
                {/* TOOLBAR */}

                <div
                    style={{
                        position: "absolute",

                        top: 15,

                        left: 15,

                        zIndex: 999,

                        background: "#fff",

                        padding: 10,

                        borderRadius: 10,

                        boxShadow: "0 2px 12px rgba(0,0,0,.15)",
                    }}
                >
                    <Space>
                        <Input
                            allowClear
                            prefix={<SearchOutlined />}
                            placeholder="Search report"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            style={{
                                width: 220,
                            }}
                        />

                        <Segmented
                            value={mapType}
                            onChange={setMapType}
                            options={[
                                {
                                    label: "Map",
                                    value: "map",
                                },

                                {
                                    label: "Satellite",
                                    value: "satellite",
                                },
                            ]}
                        />

                        <Button icon={<ReloadOutlined />} onClick={resetMap}>
                            Reset
                        </Button>

                        <Button
                            icon={<FullscreenOutlined />}
                            onClick={fullscreen}
                        >
                            Full
                        </Button>

                        <Button
                            type={showLive ? "primary" : "default"}
                            icon={<DashboardOutlined />}
                            onClick={() => setShowLive(!showLive)}
                        >
                            {showLive ? "Hide Reports" : "Show Reports"}
                        </Button>
                    </Space>
                </div>

                {/* LIVE */}

                {showLive && (
                    <div
                        style={{
                            position: "absolute",

                            top: 90,

                            left: 15,

                            zIndex: 999,

                            background: "#fff",

                            padding: 15,

                            width: 210,

                            borderRadius: 12,

                            boxShadow: "0 2px 12px rgba(0,0,0,.2)",
                        }}
                    >
                        <b>Reports</b>

                        <h1
                            style={{
                                margin: 5,
                                color: "#1677ff",
                            }}
                        >
                            {statistics.total}
                        </h1>

                        <Tag color="red">Critical {statistics.critical}</Tag>

                        <Tag color="orange">High {statistics.high}</Tag>

                        <Tag color="gold">Medium {statistics.medium}</Tag>

                        <Tag color="green">Low {statistics.low}</Tag>
                    </div>
                )}

                <MapContainer
                    ref={mapRef}
                    center={[14.9799, 102.0977]}
                    zoom={14}
                    zoomControl={false}
                    style={{
                        height: "100%",

                        width: "100%",
                    }}
                >
                    <ZoomControl position="topright" />

                    <ScaleControl position="bottomleft" />

                    <TileLayer url={tileUrl} />

                    <MarkerClusterGroup
                        chunkedLoading
                        disableClusteringAtZoom={16}
                        iconCreateFunction={createClusterIcon}
                    >
                        {filteredReports.map((report) => (
                            <Marker
                                key={report.id}
                                position={[report.latitude, report.longitude]}
                                icon={createSeverityMarker(report.severity)}
                                severity={report.severity}
                            >
                                <Popup>
                                    <h3>{report.title}</h3>

                                    <Tag color={severityColor(report.severity)}>
                                        {report.severity}
                                    </Tag>

                                    <p>
                                        <EnvironmentOutlined />{" "}
                                        {report.location}
                                    </p>

                                    <p>
                                        <b>Status:</b> {report.status}
                                    </p>

                                    <p>
                                        <b>AI:</b> {report.confidence}%
                                    </p>

                                    <p>
                                        <b>Fusion:</b> {report.fusionScore}
                                    </p>

                                    <Button type="primary" block>
                                        View Detail
                                    </Button>
                                </Popup>
                            </Marker>
                        ))}
                    </MarkerClusterGroup>
                </MapContainer>
            </div>
        </Card>
    );
}
