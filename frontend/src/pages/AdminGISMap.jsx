import { useState } from "react";
import { Row, Col, Card } from "antd";

import FilterBar from "../components/admin-GISmap/FilterPanel";
import LayerPanel from "../components/admin-GISmap/LayerControl";
import GISMap from "../components/admin-GISmap/GISMap";
import Legend from "../components/admin-GISmap/Legend";
import RoadInfoCard from "../components/admin-GISmap/RoadInfoCard";


export default function AdminGISPage() {


  const [selectedRoad, setSelectedRoad] = useState(null);



  const [layers, setLayers] = useState({

    road: true,

    heatmap: true,

    marker: true,

    satellite: false

  });



  const toggleLayer = (key)=>{

    setLayers(prev=>({

      ...prev,

      [key]: !prev[key]

    }));

  };



  return (
    <>

      <FilterBar />


      <Row gutter={16}>


        <Col span={5}>

          <LayerPanel

            layers={layers}

            toggleLayer={toggleLayer}

          />

        </Col>



        <Col span={19}>

          <Card
            bodyStyle={{
              padding:0
            }}
          >

            <GISMap

              setSelectedRoad={setSelectedRoad}

              layers={layers}

            />

          </Card>

        </Col>


      </Row>



      <Row
        gutter={16}
        style={{
          marginTop:16
        }}
      >


        <Col span={6}>

          <Legend />

        </Col>



        <Col span={18}>

          <RoadInfoCard

            road={selectedRoad}

          />

        </Col>


      </Row>


    </>
  );

}