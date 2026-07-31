import { Card, Timeline } from "antd";


const StatusTimeline = ({history}) => {


return (

<Card title="Status History">


<Timeline

items={

history.map(item=>({

children:
`${item.title} - ${item.date}`

}))

}

/>


</Card>

);


};


export default StatusTimeline;