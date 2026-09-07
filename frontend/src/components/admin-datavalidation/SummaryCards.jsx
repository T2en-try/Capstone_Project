import { Card, Col, Row, Statistic } from "antd";

import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  EditOutlined,
} from "@ant-design/icons";

export default function SummaryCards({ reports = [] }) {
  const waiting = reports.filter(
    (item) => item.verificationStatus === "WAITING"
  ).length;

  const verified = reports.filter(
    (item) => item.verificationStatus === "VERIFIED"
  ).length;

  const rejected = reports.filter(
    (item) => item.verificationStatus === "REJECTED"
  ).length;

  const cards = [
    {
      title: "Waiting Verification",
      value: waiting,
      icon: <ClockCircleOutlined />,
      color: "#faad14",
    },
    {
      title: "Verified",
      value: verified,
      icon: <CheckCircleOutlined />,
      color: "#52c41a",
    },
    {
      title: "Rejected",
      value: rejected,
      icon: <EditOutlined />,
      color: "#1677ff",
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {cards.map((card) => (
        <Col xs={24} sm={12} lg={6} key={card.title}>
          <Card
            hoverable
            style={{
              borderRadius: 12,
              height: "100%",
            }}
          >
            <Statistic
              title={card.title}
              value={card.value}
              suffix={card.suffix}
              valueStyle={{
                color: card.color,
                fontWeight: 700,
              }}
              prefix={card.icon}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}