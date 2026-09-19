import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
    Row,
    Col,
    Card,
    Typography,
    Space,
    Spin,
    Alert,
    Drawer,
    Button,
} from "antd";
import {
    EnvironmentOutlined,
    SettingOutlined,
} from "@ant-design/icons";

import FilterBar from "../components/admin-GISmap/FilterPanelEN";
import LayerPanel from "../components/admin-GISmap/LayerControlEN";
import GISMap from "../components/admin-GISmap/GISMapEN";
import Legend from "../components/admin-GISmap/Legend";
import RoadInfoCard from "../components/admin-GISmap/RoadInfoCard";

import { fetchMapPoints } from "../services/mapService";
import { fetchRoadSegmentPriority } from "../services/analyticsService";

const { Title, Text } = Typography;

// =====================================================
// Admin GIS Map
// =====================================================

export default function AdminGISMap() {
    const location = useLocation();
    const centerToGrid = location.state?.centerToGrid || null;

    const [, setSelectedRoad] = useState(null);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

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

                setMapError(
                    error?.message || "Unable to load map data."
                );
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
                    padding: "20px 16px 14px",
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
                            Monitor report locations and priority levels
                            of road damage on the map.
                        </Text>
                    </div>
                </Space>
            </div>

            {/* =================================================
                CONTENT
            ================================================= */}

            <div
                style={{
                    padding: "0 12px 28px",
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
                    <FilterBar
                        filters={filters}
                        setFilters={setFilters}
                    />
                </div>

                {/* =================================================
                    ERROR
                ================================================= */}

                {mapError && (
                    <Alert
                        type="error"
                        showIcon
                        message="Unable to load map data"
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

                    <Col
                        xs={0}
                        lg={6}
                        xl={5}
                        className="hidden lg:block"
                    >
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
                                                Critical (75–100)
                                            </Text>
                                        </div>

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
                                                High Priority (50–74)
                                            </Text>
                                        </div>

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
                                                Low / Normal (0–49)
                                            </Text>
                                        </div>

                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: 10,
                                                marginTop: 2,
                                            }}
                                        >
                                            Click a grid cell to view details.
                                        </Text>
                                    </Space>
                                </Card>
                            )}
                        </div>
                    </Col>

                    {/* =================================================
                        MOBILE DRAWER & FAB
                    ================================================= */}

                    <Button
                        type="primary"
                        shape="circle"
                        icon={<SettingOutlined />}
                        size="large"
                        className="lg:hidden"
                        style={{
                            position: "fixed",
                            bottom: 24,
                            right: 24,
                            zIndex: 1000,
                            width: 54,
                            height: 54,
                            boxShadow:
                                "0 4px 12px rgba(0,0,0,0.15)",
                            backgroundColor: "#111827",
                            borderColor: "#111827",
                        }}
                        onClick={() => setMobileDrawerOpen(true)}
                    />

                    <Drawer
                        title="Map & Layer Settings"
                        placement="bottom"
                        height="85vh"
                        onClose={() => setMobileDrawerOpen(false)}
                        open={mobileDrawerOpen}
                        className="lg:hidden"
                        styles={{
                            body: {
                                padding: "16px",
                            },
                        }}
                    >
                        <LayerPanel
                            layers={layers}
                            toggleLayer={toggleLayer}
                        />

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
                                            Critical (75–100)
                                        </Text>
                                    </div>

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
                                            High Priority (50–74)
                                        </Text>
                                    </div>

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
                                            Low / Normal (0–49)
                                        </Text>
                                    </div>
                                </Space>
                            </Card>
                        )}
                    </Drawer>

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
                                        height:
                                            "clamp(400px, 60vh, 620px)",
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
                                            Loading map data...
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
                                    centerToGrid={centerToGrid}
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