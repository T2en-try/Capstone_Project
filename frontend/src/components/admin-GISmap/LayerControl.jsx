import {
  Card,
  Switch,
  Typography,
  Divider,
  Tag,
  Space,
} from "antd";

import {
  EnvironmentOutlined,
  FireOutlined,
  GlobalOutlined,
  AppstoreOutlined,
  NodeIndexOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const COLORS = {
  text: "#1F2937",
  secondary: "#64748B",
  muted: "#94A3B8",
  border: "#E5E7EB",

  marker: "#2563EB",
  heatmap: "#DC2626",
  segment: "#F59E0B",
  satellite: "#0284C7",
  grid: "#7C3AED",

  activeBg: "#F8FAFC",
};

export default function LayerPanel({
  layers = {},
  toggleLayer,
}) {
  const layerGroups = [
    {
      title: "ข้อมูลรายงาน",
      items: [
        {
          key: "marker",
          icon: <EnvironmentOutlined />,
          color: COLORS.marker,
          title: "จุดรายงาน",
          description: "ตำแหน่งการแจ้งปัญหาบนแผนที่",
        },
        {
          key: "heatmap",
          icon: <FireOutlined />,
          color: COLORS.heatmap,
          title: "Heatmap",
          description: "ความหนาแน่นของการแจ้งปัญหา",
        },
      ],
    },
    {
      title: "การวิเคราะห์พื้นที่",
      items: [
        {
          key: "segment",
          icon: <NodeIndexOutlined />,
          color: COLORS.segment,
          title: "Road Segment Priority",
          description: "ระดับความสำคัญของช่วงถนน",
        },
        {
          key: "grid",
          icon: <AppstoreOutlined />,
          color: COLORS.grid,
          title: "Grid Priority",
          description: "CASP Grid แสดงพื้นที่เร่งด่วน",
          tag: "CASP",
        },
      ],
    },
    {
      title: "แผนที่ฐาน",
      items: [
        {
          key: "satellite",
          icon: <GlobalOutlined />,
          color: COLORS.satellite,
          title: "ภาพดาวเทียม",
          description: "ใช้ภาพถ่ายดาวเทียมเป็นพื้นหลัง",
        },
      ],
    },
  ];

  return (
    <Card
      size="small"
      bordered
      style={{
        borderRadius: 8,
        borderColor: COLORS.border,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
      }}
      styles={{
        body: {
          padding: 12,
        },
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: 4,
        }}
      >
        <Text
          strong
          style={{
            fontSize: 15,
            color: COLORS.text,
          }}
        >
          ชั้นข้อมูลแผนที่
        </Text>
      </div>

      <Text
        style={{
          fontSize: 12,
          color: COLORS.secondary,
        }}
      >
        เลือกข้อมูลที่ต้องการแสดงบนแผนที่
      </Text>

      <Divider
        style={{
          margin: "10px 0",
          borderColor: COLORS.border,
        }}
      />

      {/* Groups */}
      {layerGroups.map((group, groupIndex) => (
        <div key={group.title}>
          {/* Group title */}
          <Text
            style={{
              display: "block",
              marginBottom: 5,
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.muted,
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            {group.title}
          </Text>

          {/* Layer items */}
          <Space
            direction="vertical"
            size={4}
            style={{
              width: "100%",
              marginBottom:
                groupIndex !== layerGroups.length - 1
                  ? 12
                  : 0,
            }}
          >
            {group.items.map((item) => {
              const isActive = Boolean(
                layers[item.key]
              );

              return (
                <div
                  key={item.key}
                  onClick={() =>
                    toggleLayer(item.key)
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",

                    minHeight: 54,
                    padding: "7px 8px",

                    borderRadius: 7,
                    border: `1px solid ${
                      isActive
                        ? COLORS.border
                        : "transparent"
                    }`,

                    background: isActive
                      ? COLORS.activeBg
                      : "#FFFFFF",

                    cursor: "pointer",
                    transition:
                      "all 0.15s ease",
                  }}
                >
                  {/* Left */}
                  <Space
                    size={9}
                    align="center"
                    style={{
                      minWidth: 0,
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        minWidth: 32,

                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                          "center",

                        borderRadius: 6,

                        background: `${item.color}12`,
                        color: item.color,

                        fontSize: 17,
                      }}
                    >
                      {item.icon}
                    </div>

                    {/* Text */}
                    <div
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <Space
                        size={5}
                        align="center"
                      >
                        <Text
                          style={{
                            display: "block",
                            fontSize: 13,
                            fontWeight: 600,
                            color: COLORS.text,
                            lineHeight:
                              "18px",
                          }}
                        >
                          {item.title}
                        </Text>

                        {item.tag && (
                          <Tag
                            style={{
                              margin: 0,
                              padding: "0 4px",
                              height: 17,
                              lineHeight:
                                "15px",
                              fontSize: 9,
                              borderRadius: 4,
                            }}
                          >
                            {item.tag}
                          </Tag>
                        )}
                      </Space>

                      <Text
                        style={{
                          display: "block",
                          marginTop: 1,
                          fontSize: 11,
                          color:
                            COLORS.secondary,
                          lineHeight:
                            "16px",
                        }}
                      >
                        {item.description}
                      </Text>
                    </div>
                  </Space>

                  {/* Right */}
                  <Switch
                    size="small"
                    checked={isActive}
                    onChange={() =>
                      toggleLayer(item.key)
                    }
                    onClick={(
                      checked,
                      event
                    ) =>
                      event.stopPropagation()
                    }
                  />
                </div>
              );
            })}
          </Space>
        </div>
      ))}
    </Card>
  );
}