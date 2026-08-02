import { GeoJSON } from "react-leaflet";

import roadGeoJson from "../../mock/roadGeoJson";
import reportMock from "../../mock/reportMock";


export default function RoadLayer({onSelectRoad}) {


const styleRoad = (feature)=>{


const road =
feature.properties?.roadName;


const reports =
reportMock.filter(
(r)=>r.roadName===road
);



const hasHigh =
reports.some(
(r)=>r.severity==="High"
);



return {

color:
hasHigh
?
"red"
:
"green",


weight:
hasHigh
?
7
:
5

};


};



const onEachFeature=(feature,layer)=>{


const roadName =
feature.properties?.roadName;


const reports =
reportMock.filter(
(r)=>r.roadName===roadName
);



layer.on({

mouseover(){

layer.setStyle({
weight:10
});

},



mouseout(){

layer.setStyle(
styleRoad(feature)
);

},



click(){


onSelectRoad({

roadName,


reports:
reports.length,


pending:
reports.filter(
r=>r.status==="Pending"
).length,


severity:
reports.length
?
reports[0].severity
:
"-"


});


}


});


};



return (

<GeoJSON

data={roadGeoJson}

style={styleRoad}

onEachFeature={onEachFeature}

/>

);

}