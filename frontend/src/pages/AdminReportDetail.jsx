import { Row, Col } from "antd";
import { useParams } from "react-router-dom";

import priorityReportMock from "../mock/priorityReportMock";


import ReportHeader from "../components/admin-priority/admin-prioritydetail/ReportHeader";
import ReportInfoCard from "../components/admin-priority/admin-prioritydetail/ReportInfoCard";
import ReportImage from "../components/admin-priority/admin-prioritydetail/ReportImage";
import StatusTimeline from "../components/admin-priority/admin-prioritydetail/StatusTimeline";
import ActionPanel from "../components/admin-priority/admin-prioritydetail/ActionPanel";


const AdminReportDetail = () => {


  const { id } = useParams();


  const report = priorityReportMock.find(
    item => String(item.id) === id
  );



  if(!report){

    return (
      <h2>
        Report not found
      </h2>
    );

  }



  return (

    <>

      <ReportHeader 
        report={report}
      />


      <Row
        gutter={[16,16]}
        style={{
          marginTop:16
        }}
      >


        <Col
          xs={24}
          lg={16}
        >

          <ReportInfoCard
            report={report}
          />


          <ReportImage
            image={report.image}
          />


          <StatusTimeline
            history={report.history}
          />

        </Col>



        <Col
          xs={24}
          lg={8}
        >

          <ActionPanel
            report={report}
          />

        </Col>


      </Row>


    </>

  );

};


export default AdminReportDetail;