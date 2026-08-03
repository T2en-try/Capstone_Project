import {
    Card,
    Row,
    Col,
    Statistic,
    Tag,
    Progress,
    Typography,
    Space
} from "antd";

import {
    RobotOutlined,
    CheckCircleOutlined
} from "@ant-design/icons";


const { Text } = Typography;


const AIAnalysisCard = ({ report }) => {


    return (

        <Card

            bordered={false}

            title={
                <Space>
                    <RobotOutlined />

                    AI Analysis Result
                </Space>
            }

            style={{
                borderRadius:16
            }}

        >


            <Row gutter={[16,16]}>


                <Col xs={24} md={6}>

                    <Statistic

                        title="GEE Score"

                        value={report.gee}

                        suffix="%"

                    />

                </Col>



                <Col xs={24} md={6}>

                    <Statistic

                        title="AI Confidence"

                        value={report.priorityScore}

                        suffix="%"

                    />

                </Col>



                <Col xs={24} md={6}>

                    <Statistic

                        title="Priority Score"

                        value={report.priorityScore}

                    />

                </Col>



                <Col xs={24} md={6}>

                    <div>

                        <Text>
                            AI Decision
                        </Text>


                        <br/>


                        <Tag
                            color="green"
                            icon={<CheckCircleOutlined />}
                        >

                            ผ่านการวิเคราะห์

                        </Tag>


                    </div>


                </Col>


            </Row>



            <div
                style={{
                    marginTop:20
                }}
            >

                <Text strong>
                    Damage Detection
                </Text>


                <p>
                    {report.damageType}
                </p>


                <Progress

                    percent={report.priorityScore}

                    status="active"

                />


            </div>


        </Card>

    );

};


export default AIAnalysisCard;