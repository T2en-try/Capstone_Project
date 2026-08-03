import {
    Card,
    Descriptions,
    Tag
} from "antd";

import {
    SafetyCertificateOutlined
} from "@ant-design/icons";


const EngineerVerification = ({report}) => {


return (

<Card

bordered={false}

title={
<>
<SafetyCertificateOutlined/>

&nbsp; Engineer Verification

</>
}

style={{
borderRadius:16
}}

>


<Descriptions

column={1}

>


<Descriptions.Item label="Engineer">

{report.engineer}

</Descriptions.Item>



<Descriptions.Item label="Verification">

<Tag color="green">

Confirmed

</Tag>

</Descriptions.Item>



<Descriptions.Item label="Confirmed Damage">

{report.confirmedDamage}

</Descriptions.Item>



<Descriptions.Item label="Engineer Remark">

{report.engineerRemark}

</Descriptions.Item>



</Descriptions>


</Card>


);


};


export default EngineerVerification;