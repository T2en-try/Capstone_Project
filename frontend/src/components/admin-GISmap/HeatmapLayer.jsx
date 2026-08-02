import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

import "leaflet.heat";

import reportMock from "../../mock/reportMock";


export default function HeatmapLayer(){

    const map = useMap();


    useEffect(()=>{


        const points = reportMock.map(
            report=>[

                report.lat,

                report.lng,


                report.severity === "High"
                ?
                1

                :

                report.severity === "Medium"
                ?
                0.6

                :

                0.3

            ]
        );



        const heat =
            L.heatLayer(
                points,
                {
                    radius:40,
                    blur:25,
                    maxZoom:17
                }
            );


        heat.addTo(map);



        return ()=>{

            map.removeLayer(heat);

        };


    },[map]);



    return null;

}