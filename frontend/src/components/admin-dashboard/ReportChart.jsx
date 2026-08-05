import { Card } from "antd";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    LabelList,
} from "recharts";


const ReportBarChart = ({ data }) => {

    return (

        <Card
            title="Report By Type"
            style={{
                borderRadius:12,
            }}
        >

            <ResponsiveContainer
                width="100%"
                height={320}
            >

                <BarChart
                    data={data}
                    margin={{
                        top:20,
                        right:20,
                        left:0,
                        bottom:20,
                    }}
                >

                    <XAxis

                        dataKey="name"

                        tick={{
                            fontSize:12
                        }}

                    />


                    <YAxis

                        allowDecimals={false}

                        tick={{
                            fontSize:12
                        }}

                    />


                    <Tooltip

                        cursor={{
                            fill:"rgba(22,119,255,0.08)"
                        }}

                        formatter={(value)=>[
                            `${value} Reports`,
                            "Count"
                        ]}

                    />


                    <Bar

                        dataKey="count"

                        fill="#1677ff"

                        radius={[
                            8,
                            8,
                            0,
                            0
                        ]}

                        barSize={45}

                    >

                        <LabelList

                            dataKey="count"

                            position="top"

                            style={{
                                fontSize:12,
                                fontWeight:600
                            }}

                        />

                    </Bar>


                </BarChart>

            </ResponsiveContainer>

        </Card>

    );

};


export default ReportBarChart;