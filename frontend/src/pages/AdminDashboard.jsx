import SummaryCards from "../components/admin-dashboard/SummaryCards";
import PriorityReports from "../components/admin-dashboard/PriorityReports";
import { priorityReports } from "../mock/priorityReports";
import MapCard from "../components/admin-dashboard/MapCard";
import { mapReports } from "../mock/mapReports";
import ReportBarChart from "../components/admin-dashboard/ReportChart";
import ReportPieChart from "../components/admin-dashboard/ReportPieChart";
import { reportTypeData, reportStatusData } from "../mock/chartData";
import RecentReports from "../components/admin-dashboard/RecentReports";



import {
  recentReports
} from "../mock/recentReports";
import {
 Row,
 Col
} from "antd";

const DashboardPage = () => {


  const summaryData = {

    totalReports: 128,

    pendingReports: 35,

    processingReports: 42,

    completedReports: 51,

  };


  return (

    <div>

    <SummaryCards
        data={summaryData}
    />

    <Row gutter={[16,16]}>


<Col
 xs={24}
 lg={16}
>

<MapCard

reports={mapReports}

/>

</Col>



<Col
 xs={24}
 lg={8}
>



</Col>


</Row>
    
    <Row gutter={[16,16]}>
    <Col
        xs={24}
        lg={12}
    >
    <ReportBarChart
        data={reportTypeData}
    />
    </Col>
    <Col
        xs={24}
        lg={12}
    >
    <ReportPieChart
        data={reportStatusData}
    />
    </Col>
    </Row>
    <PriorityReports
        reports={priorityReports}
    />
    <RecentReports
        reports={recentReports}
    />

    </div>

  );

};


export default DashboardPage;