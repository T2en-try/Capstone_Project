const priorityReportMock = [

{
    id:"1",
    reportId:"RPT-001",

    roadName:"ถนนมิตรภาพ",
    damageType:"Large pothole",

    priorityScore:95,
    gee:90,

    // AI RESULT
    aiConfidence:94,

    aiResult:
        "AI ตรวจพบหลุมบ่อขนาดใหญ่บริเวณผิวถนน มีความเสียหายชัดเจน",

    // ENGINEER VERIFY
    engineer:
        "วิศวกรสมชาย แก้วเมือง",

    verificationStatus:
        "Confirmed",

    confirmedDamage:
        "ยืนยันพบหลุมบ่อขนาดใหญ่ตามผลการวิเคราะห์ของ AI",

    engineerRemark:
        "ระดับความเสียหายสูง จำเป็นต้องซ่อมแซมโดยเร็วเพื่อป้องกันอุบัติเหตุ",


    status:"Processing",

    reportDate:"August 4, 2026",

    reporter:"สมชาย ใจดี",

    location:
        "บริเวณหน้าเทอร์มินอล 21 นครราชสีมา",

    category:"Road Damage",

    createdDate:"August 4, 2026 10:30",

    updatedDate:"August 4, 2026 13:00",


    description:
        "พบหลุมบ่อขนาดใหญ่บนผิวถนน ทำให้รถต้องชะลอความเร็วและมีความเสี่ยงต่อการเกิดอุบัติเหตุ โดยเฉพาะรถจักรยานยนต์ ควรดำเนินการซ่อมแซมโดยเร็ว",

    image:
        "https://images.unsplash.com/photo-1531310197839-ccf54634509e",


    history:[
        {
            title:"Report Submitted",
            date:"August 4, 2026 10:30"
        },
        {
            title:"AI Analysis Completed",
            date:"August 4, 2026 10:45"
        },
        {
            title:"Engineer Verified Result",
            date:"August 4, 2026 11:00"
        },
        {
            title:"Repair In Progress",
            date:"August 4, 2026 13:00"
        }
    ]

},



{
    id:"2",
    reportId:"RPT-002",

    roadName:"ถนนราชสีมา-โชคชัย",

    damageType:"Cracked road surface",


    priorityScore:82,

    gee:75,


    aiConfidence:81,


    aiResult:
        "AI ตรวจพบรอยแตกร้าวบนพื้นผิวถนนหลายจุด ต้องตรวจสอบโครงสร้างเพิ่มเติม",


    engineer:
        "วิศวกรอนันต์ ศรีสุข",


    verificationStatus:
        "Confirmed",


    confirmedDamage:
        "ยืนยันพบรอยแตกร้าวของผิวทางจากการตรวจสอบหน้างาน",


    engineerRemark:
        "ควรติดตามการขยายตัวของรอยแตกร้าวและวางแผนซ่อมแซม",


    status:"Pending",

    reportDate:"August 3, 2026",

    reporter:"อนันต์ ศรีสุข",

    location:
        "อำเภอโชคชัย จังหวัดนครราชสีมา",


    category:"Road Damage",

    createdDate:"August 3, 2026 09:15",

    updatedDate:"August 3, 2026 10:00",


    description:
        "พบรอยแตกร้าวบนพื้นผิวถนนหลายตำแหน่ง เกิดจากการใช้งานต่อเนื่องและสภาพอากาศ อาจทำให้โครงสร้างถนนเสื่อมสภาพ",


    image:
        "https://images.unsplash.com/photo-1590674899484-d5640e854abe",


    history:[
        {
            title:"Report Submitted",
            date:"August 3, 2026 09:15"
        },
        {
            title:"AI Analysis Completed",
            date:"August 3, 2026 09:30"
        },
        {
            title:"Waiting for Repair Plan",
            date:"August 3, 2026 10:00"
        }
    ]

},

];


export default priorityReportMock;