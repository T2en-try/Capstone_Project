import {
  Card,
  Col,
  Row,
  Statistic,
} from "antd";

import {
  FileSearchOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";



const SummaryCards = ({ data }) => {


  const cards = [
    {
      title: "รายงานทั้งหมด",
      value: data.totalReports,
      icon: <FileSearchOutlined className="text-ink" />,
    },
    {
      title: "รอตรวจสอบ",
      value: data.pendingReports,
      icon: <ClockCircleOutlined className="text-asphalt/70" />,
    },
    {
      title: "กำลังดำเนินการ",
      value: data.processingReports,
      icon: <SyncOutlined className="text-ink-soft" />,
    },
    {
      title: "ซ่อมเสร็จแล้ว",
      value: data.completedReports,
      icon: <CheckCircleOutlined className="text-ok" />,
    },
  ];



  return (
    <Row gutter={[16,16]}>

      {cards.map((card) => (

        <Col
          key={card.title}
          xs={24}
          sm={12}
          lg={6}
        >

          <Card
            hoverable
            style={{
              borderRadius: 12,
              height: "100%"
            }}
          >

            <Statistic
              title={card.title}
              value={card.value}
              prefix={card.icon}
            />

          </Card>

        </Col>

      ))}

    </Row>
  );
};



export default SummaryCards;