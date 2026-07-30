import {
  Card
} from "antd";


import {

  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer

} from "recharts";




const ReportBarChart = ({data}) => {


  return (

    <Card

      title="Report By Type"

      style={{
        borderRadius:12
      }}

    >


      <ResponsiveContainer
        width="100%"
        height={300}
      >


        <BarChart
          data={data}
        >


          <CartesianGrid
            strokeDasharray="3 3"
          />


          <XAxis
            dataKey="name"
          />


          <YAxis />


          <Tooltip />


          <Bar

            dataKey="count"

            fill="#1677ff"

          />


        </BarChart>


      </ResponsiveContainer>


    </Card>

  );

};



export default ReportBarChart;