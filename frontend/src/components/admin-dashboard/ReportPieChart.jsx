import { Card, Row, Col, Statistic } from "antd";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = [
  "#faad14",
  "#1677ff",
  "#52c41a",
  "#ff4d4f",
];

export default function ReportPieChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card
      title="Report Status"
      style={{
        borderRadius: 12,
      }}
    >
      <Row align="middle">
        <Col span={16}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
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
              />
            </PieChart>
          </ResponsiveContainer>
        </Col>

        <Col span={8}>
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