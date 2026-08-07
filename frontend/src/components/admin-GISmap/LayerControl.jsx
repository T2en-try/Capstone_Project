import {
  Card,
  Switch,
  Typography,
  Space,
  Divider,
} from "antd";

import {
  EnvironmentOutlined,
  FireOutlined,
  ApartmentOutlined,
  GlobalOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

export default function LayerPanel({
  layers,
  toggleLayer,
}) {
  const layerItems = [
    {
      key: "marker",
      icon: (
        <EnvironmentOutlined
          style={{
            color: "#1677ff",
            fontSize: 20,
          }}
        />
      ),
      title: "Report Marker",
      description: "แสดงตำแหน่งการแจ้งปัญหาบนแผนที่",
    },

    {
      key: "heatmap",
      icon: (
        <FireOutlined
          style={{
            color: "#ff4d4f",
            fontSize: 20,
          }}
        />
      ),
      title: "Heatmap",
      description: "แสดงความหนาแน่นของการแจ้งปัญหา",
    },

    {
      key: "road",
      icon: (
        <ApartmentOutlined
          style={{
            color: "#52c41a",
            fontSize: 20,
          }}
        />
      ),
      title: "Road GIS",
      description: "แสดงเส้นถนนจากข้อมูล GIS",
    },

    {
      key: "satellite",
      icon: (
        <GlobalOutlined
          style={{
            color: "#722ed1",
            fontSize: 20,
          }}
        />
      ),
      title: "Satellite",
      description: "เปลี่ยนพื้นหลังเป็นภาพถ่ายดาวเทียม",
    },
  ];

  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 16,
      }}
    >
      <Title
        level={5}
        style={{
          marginBottom: 4,
        }}
      >
        Map Layers
      </Title>

      <Text type="secondary">
        เปิดหรือปิดข้อมูลที่ต้องการแสดงบนแผนที่
      </Text>

      <Divider />

      <Space
        direction="vertical"
        size={18}
        style={{
          width: "100%",
        }}
      >
        {layerItems.map((item) => (
          <div
            key={item.key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
            }}
          >
            <Space align="start">
              {item.icon}

              <div>
                <div
                  style={{
                    fontWeight: 600,
                  }}
                >
                  {item.title}
                </div>

                <Text
                  type="secondary"
                  style={{
                    fontSize: 12,
                  }}
                >
                  {item.description}
                </Text>
              </div>
            </Space>

            <Switch
              checked={layers[item.key]}
              onChange={() =>
                toggleLayer(item.key)
              }
            />
          </div>
        ))}
      </Space>
    </Card>
  );
}