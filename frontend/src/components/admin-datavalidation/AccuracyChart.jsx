import {
  Card,
  Row,
  Col,
  Statistic,
  Divider,
} from "antd";

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  RobotOutlined,
} from "@ant-design/icons";

import {
  Pie,
  Column,
} from "@ant-design/plots";
import aiVerificationMock from "../../mock/aiVerificationMock";


export default function AccuracyChart() {


const correct =
aiVerificationMock.filter(
 item =>
 item.verificationStatus==="VERIFIED"
).length;



const incorrect =
aiVerificationMock.filter(
 item =>
 item.verificationStatus==="CORRECTED"
).length;



const pieData=[

 {
  type:"AI Correct",
  value:correct
 },

 {
  type:"AI Incorrect",
  value:incorrect
 }

];



  const columnData = [

    {
      type: "Verified",
      value: 82,
    },

    {
      type: "Corrected",
      value: 18,
    },

    {
      type: "Waiting",
      value: 25,
    },

  ];



  const pieConfig = {

    data: pieData,

    angleField: "value",

    colorField: "type",

    radius:0.8,


    label:{
      type:"outer",
    },


  };



  const columnConfig = {

    data: columnData,

    xField:"type",

    yField:"value",

    label:{
      position:"top",
    },


  };




  return (

    <>

      <Card
        title="AI Accuracy Overview"
      >

        <Row gutter={16}>


          <Col span={12}>

            <Statistic

              title="AI Accuracy"

              value={82}

              suffix="%"

              prefix={<RobotOutlined/>}

            />

          </Col>



          <Col span={12}>

            <Statistic

              title="Verified"

              value={82}

              prefix={
                <CheckCircleOutlined/>
              }

            />

          </Col>


        </Row>



        <Divider />



        <Row gutter={16}>


          <Col span={12}>

            <Statistic

              title="Corrected"

              value={18}

              prefix={
                <CloseCircleOutlined/>
              }

            />


          </Col>



          <Col span={12}>


            <Statistic

              title="Waiting"

              value={25}

              prefix={
                <ClockCircleOutlined/>
              }

            />


          </Col>


        </Row>


      </Card>



      <br />



      <Card
        title="AI Decision Accuracy"
      >

        <Pie
          {...pieConfig}
        />

      </Card>



      <br />



      <Card
        title="Verification Status"
      >

        <Column
          {...columnConfig}
        />

      </Card>


    </>

  );

}