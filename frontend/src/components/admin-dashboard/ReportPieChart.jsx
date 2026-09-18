import { Card, Row, Col, Statistic } from "antd";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useState, useEffect } from "react";

const COLORS = [
  "#faad14",
  "#1677ff",
  "#52c41a",
  "#ff4d4f",
];

export default function ReportPieChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // ข้อ 8: Detect mobile for responsive layout
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return (
    <Card
      title="Report Status"
      style={{
        borderRadius: 12,
      }}
    >
      {/* ข้อ 8: Mobile stacked layout, Desktop side-by-side */}
      <Row align="middle" gutter={[0, 16]}>
        <Col xs={24} sm={16}>
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={isMobile ? 40 : 55}
                outerRadius={isMobile ? 70 : 95}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>

              <Tooltip
                formatter={(value) => [
                  `${value} Reports`,
                  "Count",
                ]}
              />

              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: isMobile ? 11 : 14 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Col>

        <Col xs={24} sm={8}>
          <Statistic
            title="Total Reports"
            value={total}
          />

          <div style={{ marginTop: 20 }}>
            {data.map((item, index) => (
              <div
                key={item.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 12,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: COLORS[index],
                    }}
                  />

                  {item.name}
                </div>

                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </Col>
      </Row>
    </Card>
  );
}