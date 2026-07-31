const priorityReportMock = [
  {
    id: "1",
    reportId: "RPT-001",

    roadName: "Huay Kaew Road",

    damageType: "Pothole",

    priorityScore: 95,

    gee: 90,

    status: "Processing",

    reportDate: "31 Jul 2026",

    reporter: "Somchai Jaidee",

    location: "Chiang Mai University",

    category: "Road Damage",
    createdDate: "31 Jul 2026 10:30",
    updatedDate: "31 Jul 2026 13:00",

    description:
      "Large pothole found near the university entrance. Requires urgent repair.",

    image:
      "https://images.unsplash.com/photo-1531310197839-ccf54634509e",

    history:[
      {
        title:"Report Submitted",
        date:"31 Jul 2026 10:30"
      },
      {
        title:"Assigned Engineer",
        date:"31 Jul 2026 11:00"
      },
      {
        title:"Processing",
        date:"31 Jul 2026 13:00"
      }
    ]
  },


  {
    id:"2",

    reportId:"RPT-002",

    roadName:"Nimman Road",

    damageType:"Broken Surface",

    priorityScore:75,

    gee:70,

    status:"Pending",

    reportDate:"30 Jul 2026",

    reporter:"Anan Chai",

    location:"Nimman Area",

    category:"Road Damage",
    createdDate:"30 Jul 2026 09:15",
    updatedDate:"30 Jul 2026 10:00",

    description:
      "Road surface is damaged and needs inspection.",

    image:
      "https://images.unsplash.com/photo-1590674899484-d5640e854abe",

    history:[
      {
        title:"Report Submitted",
        date:"30 Jul 2026"
      }
    ]
  }
];


export default priorityReportMock;