import { Card, Tag } from "antd";

export default function Legend() {
  return (
    <Card title="Legend">
      <p><Tag color="red">High</Tag> Severe Damage</p>

      <p><Tag color="orange">Medium</Tag> Moderate Damage</p>

      <p><Tag color="green">Low</Tag> Minor Damage</p>
    </Card>
  );
}