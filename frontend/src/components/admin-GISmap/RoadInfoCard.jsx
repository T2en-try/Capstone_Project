import { Card, Statistic, Row, Col, Tag } from "antd";


export default function RoadInfoCard({
    road
}) {


    if(!road){

        return (

            <Card
                title="Road Information"
            >

                <p>
                    Click a road on map to view details
                </p>

            </Card>

        );

    }



    return (

        <Card
            title={road.roadName}
        >


            <Row gutter={16}>


                <Col span={8}>

                    <Statistic
                        title="Total Reports"
                        value={road.reports}
                    />

                </Col>



                <Col span={8}>

                    <Statistic
                        title="Pending"
                        value={road.pending}
                    />

                </Col>



                <Col span={8}>

                    <div>

                        <p>
                            Severity
                        </p>


                        <Tag
                            color={
                                road.severity==="High"
                                ?
                                "red"
                                :
                                road.severity==="Medium"
                                ?
                                "orange"
                                :
                                "green"
                            }
                        >

                            {road.severity}

                        </Tag>

                    </div>


                </Col>


            </Row>


        </Card>

    );

}