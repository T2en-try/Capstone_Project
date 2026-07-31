import {
 Card,
 Select,
 Button,
 Space
} from "antd";


const ActionPanel = ()=>{


return (

<Card title="Update Report">


<Space
direction="vertical"
style={{
width:"100%"
}}
>


<Select
style={{
width:"100%"
}}
defaultValue="Processing"
options={[
{
label:"Pending",
value:"Pending"
},
{
label:"Processing",
value:"Processing"
},
{
label:"Completed",
value:"Completed"
}
]}
/>


<Button
type="primary"
block
>
Save Changes
</Button>


</Space>


</Card>

)

}


export default ActionPanel;