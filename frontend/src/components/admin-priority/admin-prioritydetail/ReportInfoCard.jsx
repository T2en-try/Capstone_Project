import { Card, Descriptions } from "antd";


const ReportInfoCard = ({report}) => {


return (

<Card
title="Report Information"
>

<Descriptions
column={1}
>

<Descriptions.Item label="Reporter">
{report.reporter}
</Descriptions.Item>


<Descriptions.Item label="Location">
{report.location}
</Descriptions.Item>


<Descriptions.Item label="Category">
{report.category}
</Descriptions.Item>


<Descriptions.Item label="Description">
{report.description}
</Descriptions.Item>


</Descriptions>


</Card>

)

}


export default ReportInfoCard;