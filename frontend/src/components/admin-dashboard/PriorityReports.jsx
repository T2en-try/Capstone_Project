import {
  Card,
  Col,
  Row,
  Tag,
  Typography,
  Progress,
} from "antd";


import {
  EnvironmentOutlined,
  WarningOutlined,
} from "@ant-design/icons";


const { Title, Text } = Typography;



const PriorityReports = ({ reports }) => {


  const severityColor = {
    Critical: "red",
    High: "orange",
    Medium: "gold",
    Low: "green",
  };



  return (

    <Card
      title={
        <span>
          <WarningOutlined />
          {" "}
          รายงานสำคัญ (Priority Reports)
        </span>
      }
      style={{
        borderRadius:12
      }}
    >


      <Row gutter={[16,16]}>

        {
          reports.map((report)=>(

            <Col
              key={report.id}
              xs={24}
              md={8}
            >


              <Card
                size="small"
                hoverable
                style={{
                  height:"100%"
                }}
              >


                <Title level={5}>
                  {report.title}
                </Title>



                <Tag
                  color={severityColor[report.severity]}
                >
                  {report.severity}
                </Tag>



                <p>
                  <EnvironmentOutlined />
                  {" "}
                  สถานที่: {report.location}
                </p>



                <Text>
                  ความเชื่อมั่น AI
                </Text>


                <Progress
                  percent={report.confidence}
                  size="small"
                />



                <p>
                  Status :
                  {" "}

                  <Tag>
                    {report.status}
                  </Tag>
                </p>



                <Text type="secondary">
                  {report.time}
                </Text>


              </Card>


            </Col>


          ))
        }


      </Row>


    </Card>

  );

};



export default PriorityReports;