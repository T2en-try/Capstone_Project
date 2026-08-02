const roadGeoJson = {
  type: "FeatureCollection",

  features: [

    {
      type: "Feature",

      properties: {
        roadName: "Huay Kaew Road"
      },

      geometry: {
        type: "LineString",

        coordinates: [

          [98.963,18.804],

          [98.968,18.801],

          [98.973,18.798],

          [98.978,18.795]

        ]
      }

    },

    {
      type: "Feature",

      properties: {
        roadName: "Nimmanhaemin Road"
      },

      geometry: {
        type: "LineString",

        coordinates: [

          [98.965,18.799],

          [98.970,18.797],

          [98.975,18.794]

        ]
      }

    }

  ]

}

export default roadGeoJson;