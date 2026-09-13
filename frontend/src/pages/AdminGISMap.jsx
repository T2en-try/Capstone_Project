import { useEffect, useState } from "react";
import { Row, Col, Card, Typography, Space, Spin, Alert } from "antd";
import { EnvironmentOutlined } from "@ant-design/icons";

import FilterBar from "../components/admin-GISmap/FilterPanel";
import LayerPanel from "../components/admin-GISmap/LayerControl";
import GISMap from "../components/admin-GISmap/GISMap";
import Legend from "../components/admin-GISmap/Legend";
import RoadInfoCard from "../components/admin-GISmap/RoadInfoCard";

import { fetchMapPoints } from "../services/mapService";
import { fetchRoadSegmentPriority } from "../services/analyticsService";

const { Title, Text } = Typography;

// =====================================================
// Admin GIS Map
// =====================================================

export default function AdminGISMap() {
    const [, setSelectedRoad] = useState(null);

    const [mapPoints, setMapPoints] = useState([]);

    const [mapLoading, setMapLoading] = useState(true);

    const [mapError, setMapError] = useState(null);

    const [segmentData, setSegmentData] = useState([]);

    const [layers, setLayers] = useState({
        road: true,
        heatmap: true,
        marker: true,
        satellite: false,
        grid: true,
        segment: true,
    });

    const [filters, setFilters] = useState({
        keyword: "",
        severity: "All",
        status: "All",
    });

    // =====================================================
    // Load GIS Data
    // =====================================================

    useEffect(() => {
        const loadMapData = async () => {
            try {
                setMapLoading(true);
                setMapError(null);

                const [mapResult, segmentResult] = await Promise.all([
                    fetchMapPoints(false),
                    fetchRoadSegmentPriority(30),
                ]);

                console.log("GIS Map Points:", mapResult);
                console.log("Road Segment Priority:", segmentResult);

                setMapPoints(mapResult?.points || []);

                setSegmentData(segmentResult?.segments || []);
            } catch (error) {
                console.error("Failed to load GIS map data:", error);

                setMapError(error?.message || "ไม่สามารถโหลดข้อมูลแผนที่ได้");
            } finally {
                setMapLoading(false);
            }
        };

        loadMapData();
    }, []);

    // =====================================================
    // Toggle Layer
    // =====================================================

    const toggleLayer = (key) => {
        setLayers((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    // =====================================================
    // Render
    // =====================================================

    return (
        <div
            style={{
                width: "100%",
                minHeight: "100vh",
                background: "#F5F6F8",
            }}
        >
            {/* =================================================
          PAGE HEADER
      ================================================= */}

            <div
                style={{
                    padding: "28px 36px 18px",
                }}
            >
                <Space size={14} align="center">
                    {/* Icon */}

                    <div
                        style={{
                            width: 42,
                            height: 42,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#EFF6FF",
                            borderRadius: 6,
                            flexShrink: 0,
                        }}
                    >
                        <EnvironmentOutlined
                            style={{
                                fontSize: 23,
                                color: "#2563EB",
                            }}
                        />
                    </div>

                    {/* Title */}

                    <div>
                        <Title
                            level={2}
                            style={{
                                margin: 0,
                                color: "#111827",
                                fontSize: 27,
                                fontWeight: 700,
                                lineHeight: 1.2,
                            }}
                        >
                            GIS Road Monitoring
                        </Title>

                        <Text
                            style={{
                                display: "block",
                                marginTop: 5,
                                color: "#64748B",
                                fontSize: 13,
                                lineHeight: 1.5,
                            }}
                        >
                            ตรวจสอบตำแหน่งและระดับความสำคัญของรายงานความเสียหายบนแผนที่
                        </Text>
                    </div>
                </Space>
            </div>

            {/* =================================================
          CONTENT
      ================================================= */}

            <div
                style={{
                    padding: "0 24px 28px",
                }}
            >
                {/* =================================================
            FILTER
        ================================================= */}

                <div
                    style={{
                        marginBottom: 14,
                    }}
                >
                    <FilterBar filters={filters} setFilters={setFilters} />
                </div>

                {/* =================================================
            ERROR
        ================================================= */}

                {mapError && (
                    <Alert
                        type="error"
                        showIcon
                        message="ไม่สามารถโหลดข้อมูลแผนที่"
                        description={mapError}
                        style={{
                            marginBottom: 14,
                            borderRadius: 8,
                        }}
                    />
                )}

                {/* =================================================
            MAP SECTION
        ================================================= */}

                <Row gutter={16} align="top">
                    {/* =================================================
              SIDEBAR
          ================================================= */}

                    <Col xs={24} lg={6} xl={5}>
                        <div
                            style={{
                                position: "sticky",
                                top: 16,
                            }}
                        >
                            {/* Layer Control */}

                            <LayerPanel
                                layers={layers}
                                toggleLayer={toggleLayer}
                            />

                            {/* Grid Legend */}

                            {layers.grid && (
                                <Card
                                    size="small"
                                    style={{
                                        marginTop: 10,
                                        borderRadius: 8,
                                        borderColor: "#E5E7EB",
                                        boxShadow: "none",
                                    }}
                                    styles={{
                                        header: {
                                            minHeight: 42,
                                            padding: "0 12px",
                                        },
                                        body: {
                                            padding: "10px 12px",
                                        },
                                    }}
                                    title={
                                        <span
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: "#1F2937",
                                            }}
                                        >
                                            Grid Priority Legend
                                        </span>
                                    }
                                >
                                    <Space
                                        direction="vertical"
                                        size={5}
                                        style={{
                                            width: "100%",
                                        }}
                                    >
                                        {/* Critical */}

                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 7,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 16,
                                                    height: 12,
                                                    background: "#DC2626",
                                                    borderRadius: 2,
                                                    flexShrink: 0,
                                                }}
                                            />

                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    color: "#475569",
                                                }}
                                            >
                                                เร่งด่วน (80–100)
                                            </Text>
                                        </div>

                                        {/* High */}

                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 7,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 16,
                                                    height: 12,
                                                    background: "#F97316",
                                                    borderRadius: 2,
                                                    flexShrink: 0,
                                                }}
                                            />

                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    color: "#475569",
                                                }}
                                            >
                                                สูง (50–79)
                                            </Text>
                                        </div>

                                        {/* Medium */}

                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 7,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 16,
                                                    height: 12,
                                                    background: "#EAB308",
                                                    borderRadius: 2,
                                                    flexShrink: 0,
                                                }}
                                            />

                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    color: "#475569",
                                                }}
                                            >
                                                ปานกลาง (25–49)
                                            </Text>
                                        </div>

                                        {/* Low */}

                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 7,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 16,
                                                    height: 12,
                                                    background: "#22C55E",
                                                    borderRadius: 2,
                                                    flexShrink: 0,
                                                }}
                                            />

                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    color: "#475569",
                                                }}
                                            >
                                                ต่ำ (0–24)
                                            </Text>
                                        </div>

                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: 10,
                                                marginTop: 2,
                                            }}
                                        >
                                            คลิก Grid เพื่อดูรายละเอียด
                                        </Text>
                                    </Space>
                                </Card>
                            )}
                        </div>
                    </Col>

                    {/* =================================================
              MAP
          ================================================= */}

                    <Col xs={24} lg={18} xl={19}>
                        <Card
                            bordered={false}
                            style={{
                                borderRadius: 8,
                                overflow: "hidden",
                                border: "1px solid #E5E7EB",
                                background: "#FFFFFF",
                                boxShadow: "none",
                            }}
                            styles={{
                                body: {
                                    padding: 0,
                                },
                            }}
                        >
                            {mapLoading ? (
                                <div
                                    style={{
                                        height: 620,
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        background: "#FFFFFF",
                                    }}
                                >
                                    <Space
                                        direction="vertical"
                                        align="center"
                                        size={8}
                                    >
                                        <Spin size="large" />

                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: 13,
                                            }}
                                        >
                                            กำลังโหลดข้อมูลแผนที่...
                                        </Text>
                                    </Space>
                                </div>
                            ) : (
                                <GISMap
                                    setSelectedRoad={setSelectedRoad}
                                    layers={layers}
                                    filters={filters}
                                    gridDays={7}
                                    mapPoints={mapPoints}
                                    segmentData={segmentData}
                                />
                            )}
                        </Card>
                    </Col>
                </Row>

                {/* =================================================
            INFORMATION
        ================================================= */}

                {/* <Row
                    gutter={16}
                    style={{
                        marginTop: 16,
                    }}
                >
                    <Col xs={24} lg={6}>
                        <Legend />
                    </Col>

                    <Col xs={24} lg={18}>
                        <RoadInfoCard road={selectedRoad} />
                    </Col>
                </Row> */}
            </div>
        </div>
    );
}
