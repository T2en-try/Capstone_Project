import { Card, Image } from "antd";


const ReportImage = ({image})=>{


return (

<Card title="Report Image">

<Image
width="100%"
src={image}
/>

</Card>

)

}


export default ReportImage;