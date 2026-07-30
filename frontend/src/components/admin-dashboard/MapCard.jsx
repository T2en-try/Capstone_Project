import {
  MapContainer,
  TileLayer,
  Marker,
  Popup
} from "react-leaflet";


import {
  Card
} from "antd";


import L from "leaflet";



// Fix default marker issue

delete L.Icon.Default.prototype._getIconUrl;


L.Icon.Default.mergeOptions({

  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

});




const MapView = ({ reports }) => {


  return (

    <Card
      title="แผนที่ตรวจสอบถนน"
      style={{
        borderRadius:12
      }}
    >


      <MapContainer

        center={[
          14.9799,
          102.0977
        ]}

        zoom={14}

        style={{
          height:"500px",
          width:"100%",
          borderRadius:"12px"
        }}

      >


        <TileLayer

          url="
          https://tile.openstreetmap.org/{z}/{x}/{y}.png
          "

        />



        {
          reports.map((report)=>(


            <Marker

              key={report.id}

              position={[
                report.latitude,
                report.longitude
              ]}

            >


              <Popup>


                <b>
                  {report.title}
                </b>


                <br/>


                Severity :
                {" "}
                {report.severity}


                <br/>


                Status :
                {" "}
                {report.status}


              </Popup>


            </Marker>


          ))
        }


      </MapContainer>


    </Card>

  );

};



export default MapView;