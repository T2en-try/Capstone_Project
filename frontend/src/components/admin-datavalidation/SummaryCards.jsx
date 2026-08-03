import { Card, Col, Row, Statistic } from "antd";

import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  EditOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";

import aiVerificationMock from "../../mock/aiVerificationMock";

export default function SummaryCards() {
  const waiting = aiVerificationMock.filter(
    (item) => item.verificationStatus === "WAITING"
  ).length;

  const verified = aiVerificationMock.filter(
    (item) => item.verificationStatus === "VERIFIED"
  ).length;

  const corrected = aiVerificationMock.filter(
    (item) => item.verificationStatus === "CORRECTED"
  ).length;

  const reviewed = verified + corrected;

  const accuracy =
    reviewed === 0
      ? 0
      : Math.round((verified / reviewed) * 1000) / 10;

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
      title: "Corrected",
      value: corrected,
      icon: <EditOutlined />,
      color: "#1677ff",
    },
    {
      title: "AI Accuracy",
      value: accuracy,
      suffix: "%",
      icon: <SafetyCertificateOutlined />,
      color: "#722ed1",
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