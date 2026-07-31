import { Card, Tag, Typography, Space } from "antd";


const { Title, Text } = Typography;


const ReportHeader = ({report}) => {


return (

<Card>

<Space direction="vertical" size={8}>

<Text>
Report ID : {report.reportId}
</Text>


<Title level={3}>
{report.title}
</Title>


<Space>

<Tag color="red">
Priority : {report.priorityScore}
</Tag>


<Tag color="blue">
Status : {report.status}
</Tag>


</Space>


<Text type="secondary">
Created : {report.createdDate} | Updated : {report.updatedDate}
</Text>


</Space>


</Card>

)

}


export default ReportHeader;