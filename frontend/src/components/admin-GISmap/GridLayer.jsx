import { useEffect, useState } from "react";
import { Rectangle, Popup, useMap } from "react-leaflet";
import { Tag, Space, Divider, Progress, Tooltip, Badge } from "antd";
import { fetchGridPriority } from "../../services/analyticsService";

const LEVEL_CONFIG = {
  critical: { fillOpacity: 0.55, weight: 2 },
  high:     { fillOpacity: 0.42, weight: 1.5 },
  medium:   { fillOpacity: 0.30, weight: 1 },
  low:      { fillOpacity: 0.20, weight: 1 },
};

/**
 * GridLayer — วาด Rectangle บน Leaflet map แสดงระดับ Priority ของแต่ละ Grid
 * ใช้ใน GISMap.jsx
 */
export default function GridLayer({ days = 7, visible = true }) {
  const [grids, setGrids] = useState([]);
  const map = useMap();

  useEffect(() => {
    if (!visible) return;
    fetchGridPriority(days)
      .then((d) => setGrids(d.grids ?? []))
      .catch(console.error);
  }, [days, visible]);

  if (!visible) return null;

  return (
    <>
      {grids.map((g) => {
        const cfg = LEVEL_CONFIG[g.priority_level] ?? LEVEL_CONFIG.low;
        const bounds = [
          [g.lat_min, g.lon_min],
          [g.lat_max, g.lon_max],
        ];
        return (
          <Rectangle
            key={g.grid_id}
            bounds={bounds}
            pathOptions={{
              color: g.priority_color,
              fillColor: g.priority_color,
              fillOpacity: cfg.fillOpacity,
              weight: cfg.weight,
            }}
            eventHandlers={{
              click: () => map.flyTo([g.lat_center, g.lon_center], 16, { animate: true }),
            }}
          >
            <Popup minWidth={260}>
              <div style={{ fontSize: 13 }}>
                <b style={{ fontSize: 14 }}>📍 {g.grid_id}</b>
                <Divider style={{ margin: "6px 0" }} />

                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <div>
                    <span style={{ color: "#8c8c8c" }}>ระดับความเร่งด่วน: </span>
                    <Tag color={
                      g.priority_level === "critical" ? "red" :
                      g.priority_level === "high" ? "orange" :
                      g.priority_level === "medium" ? "gold" : "green"
                    }>
                      {g.priority_level.toUpperCase()}
                    </Tag>
                  </div>

                  <div>
                    <span style={{ color: "#8c8c8c" }}>Overall Priority: </span>
                    <Progress
                      percent={g.overall_priority}
                      size="small"
                      strokeColor={g.priority_color}
                      format={(p) => <b style={{ color: g.priority_color }}>{p?.toFixed(0)}</b>}
                    />
                  </div>

                  <Divider style={{ margin: "4px 0" }} />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#8c8c8c" }}>PPI (AI)</div>
                      <div style={{ fontWeight: 700 }}>{g.avg_ppi.toFixed(1)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#8c8c8c" }}>CUS (ประชาชน)</div>
                      <div style={{ fontWeight: 700, color: "#722ed1" }}>{g.cus.toFixed(1)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#8c8c8c" }}>จำนวนรายงาน</div>
                      <div style={{ fontWeight: 700 }}>
                        <Badge count={g.report_count} color="#1677ff" overflowCount={999} showZero />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#8c8c8c" }}>Recency Score</div>
                      <div style={{ fontWeight: 700 }}>{g.recency_score.toFixed(1)}</div>
                    </div>
                  </div>

                  <Divider style={{ margin: "4px 0" }} />

                  <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                    Count: {g.count_score.toFixed(0)} &nbsp;|&nbsp;
                    Density: {g.density_score.toFixed(0)} &nbsp;|&nbsp;
                    Recency: {g.recency_score.toFixed(0)}
                  </div>
                </Space>
              </div>
            </Popup>
          </Rectangle>
        );
      })}
    </>
  );
}
