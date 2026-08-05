import { Card, Checkbox, Typography } from "antd";

const { Title } = Typography;


export default function LayerPanel({

    layers,

    toggleLayer

}) {


return (

<Card>


<Title level={5}>
    Map Layers
</Title>



<div

style={{

    display:"flex",

    flexDirection:"column",

    gap:12

}}

>


<Checkbox

checked={layers.marker}

onChange={()=>toggleLayer("marker")}

>

Report Marker

</Checkbox>



<Checkbox

checked={layers.heatmap}

onChange={()=>toggleLayer("heatmap")}

>

Heatmap

</Checkbox>



<Checkbox

checked={layers.road}

onChange={()=>toggleLayer("road")}

>

Road GIS

</Checkbox>



<Checkbox

checked={layers.satellite}

onChange={()=>toggleLayer("satellite")}

>

Satellite

</Checkbox>



</div>


</Card>

);


}