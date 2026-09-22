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

import { useState, useEffect } from "react";

const ReportBarChart = ({ data, title = "Report By Type" }) => {

    // ข้อ 8: Detect mobile for responsive chart
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
    
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);

    return (

        <Card
            title={title}
            style={{
                borderRadius:12,
            }}
        >

            <ResponsiveContainer
                width="100%"
                height={isMobile ? 220 : 320}
            >

                <BarChart
                    data={data}
                    margin={{
                        top: isMobile ? 10 : 20,
                        right: isMobile ? 5 : 20,
                        left: 0,
                        bottom: isMobile ? 5 : 20,
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

                        barSize={isMobile ? 28 : 45}

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