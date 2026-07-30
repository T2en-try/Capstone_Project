import {
  Card,
  Tag,
  Progress,
  Typography,
  Space,
} from "antd";


import {
  RobotOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";



const {
  Title,
  Text
} = Typography;




const AIAnalysis = ({data}) => {


return (

<Card

title={
<>
<RobotOutlined />

{" "}

วิเคราะห์ด้วย AI

</>
}


style={{
borderRadius:12
}}

>


<Space
direction="vertical"
size="middle"
style={{
width:"100%"
}}
>



<Title level={4}>

{data.detectedObject}

</Title>




<Tag
color={
data.severity === "High"
?
"red"
:
"orange"
}
icon={<WarningOutlined />}
>

{data.severity}

</Tag>





<div>

<Text>
ความเชื่อมั่น AI
</Text>


<Progress

percent={data.confidence}

/>


</div>





<div>

<Text strong>
โมเดล AI
</Text>


<br/>


<Text type="secondary">

{data.model}

</Text>


</div>





<div>

<Text strong>
ข้อเสนอแนะ
</Text>


<br/>


<Text>

{data.recommendation}

</Text>


</div>





<Tag

color="green"

icon={
<CheckCircleOutlined />
}

>

สถานะ: {data.status}

</Tag>



</Space>



</Card>

);


};



export default AIAnalysis;