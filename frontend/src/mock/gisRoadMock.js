const gisRoadMock = [
  {
    id: "ROAD-001",
    roadName: "ถนนมิตรภาพ",
    severity: "High",
    reports: 15,
    status: "Pending",

    geometry: [
      [14.9795, 102.0950],
      [14.9810, 102.0980],
      [14.9830, 102.1010],
      [14.9850, 102.1040],
    ],

    heatPoints:[
      [14.9810,102.0980,0.8],
      [14.9830,102.1010,0.5]
    ]
  },


  {
    id:"ROAD-002",
    roadName:"ถนนสุรนารี",
    severity:"Medium",
    reports:8,
    status:"Processing",

    geometry:[
      [14.9750,102.0900],
      [14.9780,102.0940],
      [14.9810,102.0970]
    ],

    heatPoints:[
      [14.9780,102.0940,0.6]
    ]
  }
];


export default gisRoadMock;