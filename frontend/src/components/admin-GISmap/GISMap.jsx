import { MapContainer, TileLayer } from "react-leaflet";

import MarkerLayer from "./MarkerLayer";
import RoadLayer from "./RoadLayer";
import HeatmapLayer from "./HeatmapLayer";

import "leaflet/dist/leaflet.css";


export default function GISMap({

    setSelectedRoad,

    layers

}) {


    return (

        <MapContainer

            center={[18.799,98.975]}

            zoom={13}

            style={{
                height:"650px",
                width:"100%"
            }}

        >


            <TileLayer

                attribution="OpenStreetMap"

                url={
                    layers.satellite

                    ?

                    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"

                    :

                    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                }

            />



            {
                layers.road &&

                <RoadLayer

                    onSelectRoad={setSelectedRoad}

                />

            }



            {
                layers.heatmap &&

                <HeatmapLayer />

            }



            {
                layers.marker &&

                <MarkerLayer />

            }


        </MapContainer>

    );

}