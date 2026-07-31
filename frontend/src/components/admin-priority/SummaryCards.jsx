import { Card, Col, Row, Statistic } from "antd";
import {
  FileTextOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

const SummaryCards = () => {
  const cards = [
    {
      title: "Total Reports",
      value: 126,
      icon: <FileTextOutlined />,
      color: "#1677ff",
    },
    {
      title: "Pending",
      value: 58,
      icon: <ClockCircleOutlined />,
      color: "#faad14",
    },
    {
      title: "Processing",
      value: 42,
      icon: <SyncOutlined spin />,
      color: "#13c2c2",
    },
    {
      title: "Completed",
      value: 26,
      icon: <CheckCircleOutlined />,
      color: "#52c41a",
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {cards.map((card) => (
        <Col xs={24} sm={12} lg={6} key={card.title}>
          <Card bordered={false}>
            <Statistic
              title={card.title}
              value={card.value}
              prefix={
                <span
                  style={{
                    color: card.color,
                    fontSize: 22,
                    marginRight: 8,
                  }}
                >
                  {card.icon}
                </span>
              }
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default SummaryCards;