const aiVerificationMock = [

    {
        id:1,

        reportId:"RPT-0001",

        roadName:"ถนนมิตรภาพ",

        district:"เมืองนครราชสีมา",

        image:"",

        aiDecision:"Critical",

        confidence:96,

        fusionScore:94,

        engineerDecision:null,

        verificationStatus:"WAITING",

        createdAt:"2026-08-02 13:40"
    },

    {

        id:2,

        reportId:"RPT-0002",

        roadName:"ถนนสุรนารี",

        district:"เมืองนครราชสีมา",

        image:"",

        aiDecision:"Warning",

        confidence:88,

        fusionScore:82,

        engineerDecision:"Correct",

        verificationStatus:"VERIFIED",

        createdAt:"2026-08-02 15:12"
    },

    {

        id:3,

        reportId:"RPT-0003",

        roadName:"ถนนราชสีมา",

        district:"เมืองนครราชสีมา",

        image:"",

        aiDecision:"Moderate",

        confidence:75,

        fusionScore:71,

        engineerDecision:"Incorrect",

        verificationStatus:"CORRECTED",

        createdAt:"2026-08-03 09:15"
    }

]

export default aiVerificationMock