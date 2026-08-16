import { useState } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Space,
  Select,
  Tag,
  Tooltip,
} from "antd";

import { EnvironmentOutlined, InfoCircleOutlined } from "@ant-design/icons";

import FilterBar from "../components/admin-GISmap/FilterPanel";
import LayerPanel from "../components/admin-GISmap/LayerControl";
import GISMap from "../components/admin-GISmap/GISMap";
import Legend from "../components/admin-GISmap/Legend";
import RoadInfoCard from "../components/admin-GISmap/RoadInfoCard";

const { Title, Text } = Typography;

const GRID_DAYS_OPTIONS = [
  { label: "7 วัน", value: 7 },
  { label: "14 วัน", value: 14 },
  { label: "30 วัน", value: 30 },
];

// Legend สี Grid Priority
const GRID_LEGEND = [
  { color: "#ff4d4f", label: "เร่งด่วน (80–100)" },
  { color: "#fa8c16", label: "สูง (50–79)" },
  { color: "#fadb14", label: "ปานกลาง (25–49)" },
  { color: "#52c41a", label: "ต่ำ (0–24)" },
];

export default function AdminGISPage() {
  const [selectedRoad, setSelectedRoad] = useState(null);
  const [gridDays, setGridDays] = useState(7);

  const [layers, setLayers] = useState({
    road: true,
    heatmap: true,
    marker: true,
    satellite: false,
    grid: true,          // ← เพิ่ม Grid Priority layer (เปิดเป็น default)
  });

  const [filters, setFilters] = useState({
    keyword: "",
    severity: "All",
    status: "All",
  });

  const toggleLayer = (key) => {
    setLayers((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <Space
      direction="vertical"
      size={20}
      style={{
        width: "100%",
      }}
    >
      {/* Header */}

      <Card
        bordered={false}
        style={{
          borderRadius: 16,
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <EnvironmentOutlined
                style={{
                  fontSize: 30,
                  color: "#1677ff",
                }}
              />

              <div>
                <Title
                  level={3}
                  style={{
                    margin: 0,
                  }}
                >
                  GIS Road Monitoring
                </Title>

                <Text type="secondary">
                  แสดงตำแหน่งความเสียหายของถนน พร้อม Heatmap, Marker และ
                  CASP Grid Priority (Overall = 0.8×PPI + 0.2×CUS)
                </Text>
              </div>
            </Space>
          </Col>

          {/* Grid Days Selector — แสดงเฉพาะเมื่อ Grid layer เปิดอยู่ */}
          {layers.grid && (
            <Col>
              <Space size={8}>
                <Tooltip title="ช่วงเวลาย้อนหลังสำหรับ Grid Priority">
                  <InfoCircleOutlined style={{ color: "#8c8c8c" }} />
                </Tooltip>
                <Text style={{ fontSize: 13 }}>Grid ย้อนหลัง:</Text>
                <Select
                  size="small"
                  value={gridDays}
                  options={GRID_DAYS_OPTIONS}
                  onChange={setGridDays}
                  style={{ width: 90 }}
                />
              </Space>
            </Col>
          )}
        </Row>
      </Card>

      {/* Filter */}

      <FilterBar
        filters={filters}
        setFilters={setFilters}
      />

      {/* Map */}

      <Row gutter={20} align="top">
        <Col xs={24} lg={6} xl={5}>
          <div
            style={{
              position: "sticky",
              top: 20,
            }}
          >
            <LayerPanel
              layers={layers}
              toggleLayer={toggleLayer}
            />

            {/* CASP Grid Legend */}
            {layers.grid && (
              <Card
                size="small"
                style={{ borderRadius: 12, marginTop: 12 }}
                title={
                  <span style={{ fontSize: 13 }}>
                    🗺️ Grid Priority Legend
                  </span>
                }
              >
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  {GRID_LEGEND.map(({ color, label }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 18,
                          height: 14,
                          background: color,
                          borderRadius: 3,
                          opacity: 0.8,
                          border: `1.5px solid ${color}`,
                        }}
                      />
                      <Text style={{ fontSize: 12 }}>{label}</Text>
                    </div>
                  ))}
                  <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
                    คลิก Grid เพื่อดูรายละเอียด
                  </Text>
                </Space>
              </Card>
            )}
          </div>
        </Col>

        <Col xs={24} lg={18} xl={19}>
          <Card
            bordered={false}
            style={{
              borderRadius: 16,
              overflow: "hidden",
            }}
            bodyStyle={{
              padding: 0,
            }}
          >
            <GISMap
              setSelectedRoad={setSelectedRoad}
              layers={layers}
              filters={filters}
              gridDays={gridDays}
            />
          </Card>
        </Col>
      </Row>

      {/* Bottom */}

      <Row gutter={20}>
        <Col xs={24} lg={6}>
          <Legend />
        </Col>

        <Col xs={24} lg={18}>
          <RoadInfoCard
            road={selectedRoad}
          />
        </Col>
      </Row>
    </Space>
  );
}