import {
  Card
} from "antd";


import {

 PieChart,
 Pie,
 Cell,
 Tooltip,
 ResponsiveContainer

} from "recharts";





const ReportPieChart = ({data}) => {



const COLORS = [
  "#faad14",
  "#1677ff",
  "#52c41a"
];



return (

<Card

 title="Report Status"

 style={{
   borderRadius:12
 }}

>


<ResponsiveContainer
 width="100%"
 height={300}
>


<PieChart>


<Pie

 data={data}

 dataKey="value"

 nameKey="name"

 cx="50%"

 cy="50%"

 outerRadius={100}

 label


>


{
data.map((entry,index)=>(

<Cell

 key={`cell-${index}`}

 fill={COLORS[index % COLORS.length]}

/>

))

}


</Pie>


<Tooltip />


</PieChart>


</ResponsiveContainer>


</Card>


);


};



export default ReportPieChart;