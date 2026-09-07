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
export default function AccuracyChart({ reports = [] }) {


const correct =
reports.filter(
 item =>
 item.verificationStatus==="VERIFIED"
).length;



const incorrect =
reports.filter(
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
      value: correct,
    },

    {
      type: "Corrected",
      value: incorrect,
    },

    {
      type: "Waiting",
      value: reports.filter((item) => item.verificationStatus === "WAITING").length,
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

              value={reports.length ? Math.round((correct / (correct + incorrect || 1)) * 100) : 0}

              suffix="%"

              prefix={<RobotOutlined/>}

            />

          </Col>



          <Col span={12}>

            <Statistic

              title="Verified"

              value={correct}

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

              value={incorrect}

              prefix={
                <CloseCircleOutlined/>
              }

            />


          </Col>



          <Col span={12}>


            <Statistic

              title="Waiting"

              value={reports.filter((item) => item.verificationStatus === "WAITING").length}

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