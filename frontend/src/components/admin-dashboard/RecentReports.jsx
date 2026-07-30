import {
  Card,
  Table,
  Tag,
} from "antd";



const RecentReports = ({reports}) => {



const columns = [

  {
    title:"Report ID",
    dataIndex:"id",
    key:"id",
  },


  {
    title:"Type",
    dataIndex:"type",
    key:"type",
  },


  {
    title:"Location",
    dataIndex:"location",
    key:"location",
  },


  {
    title:"Severity",
    dataIndex:"severity",
    key:"severity",

    render:(severity)=>(

      <Tag
        color={
          severity === "Critical"
          ? "red"
          :
          severity === "High"
          ? "orange"
          :
          severity === "Medium"
          ? "gold"
          :
          "green"
        }
      >

        {severity}

      </Tag>

    )

  },


  {
    title:"Status",
    dataIndex:"status",
    key:"status",

    render:(status)=>(

      <Tag>

        {status}

      </Tag>

    )

  },


  {
    title:"Reporter",
    dataIndex:"reporter",
    key:"reporter",
  },


  {
    title:"Created",
    dataIndex:"createdAt",
    key:"createdAt",
  },


];





return (

<Card

 title="รายการแจ้งล่าสุด"

 style={{
   borderRadius:12
 }}

>


<Table

 columns={columns}

 dataSource={reports}

 rowKey="id"

 pagination={{
   pageSize:5
 }}

 scroll={{
   x:900
 }}

/>


</Card>

);


};



export default RecentReports;