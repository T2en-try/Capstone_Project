import { useState } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Space,
} from "antd";

import { EnvironmentOutlined } from "@ant-design/icons";

import FilterBar from "../components/admin-GISmap/FilterPanel";
import LayerPanel from "../components/admin-GISmap/LayerControl";
import GISMap from "../components/admin-GISmap/GISMap";
import Legend from "../components/admin-GISmap/Legend";
import RoadInfoCard from "../components/admin-GISmap/RoadInfoCard";

const { Title, Text } = Typography;

export default function AdminGISPage() {
  const [selectedRoad, setSelectedRoad] = useState(null);

  const [layers, setLayers] = useState({
    road: true,
    heatmap: true,
    marker: true,
    satellite: false,
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
              แสดงตำแหน่งความเสียหายของถนน พร้อม Heatmap,
              Marker และข้อมูลการวิเคราะห์จาก AI
            </Text>
          </div>
        </Space>
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