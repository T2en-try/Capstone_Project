import {
  Clock3,
  Wrench,
  Send,
  CheckCircle2,
} from "lucide-react";

import { LucideIcon } from "lucide-react";

export interface StatusItem {
  title: string;
  value: number;
  description: string;
  bgColor: string;
  textColor: string;
  icon: LucideIcon;
}

export const dashboardStats: StatusItem[] = [
  {
    title: "รอดำเนินการ",
    value: 25,
    description: "รายการที่รอการตรวจสอบ",
    bgColor: "bg-red-100",
    textColor: "text-red-600",
    icon: Clock3,
  },
   {
    title: "ส่งต่อหน่วยงาน",
    value: 8,
    description: "ส่งต่อหน่วยงานที่เกี่ยวข้อง",
    bgColor: "bg-blue-100",
    textColor: "text-blue-600",
    icon: Send,
  },
  {
    title: "กำลังดำเนินการ",
    value: 14,
    description: "อยู่ระหว่างการซ่อมแซม",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-600",
    icon: Wrench,
  },
  {
    title: "ซ่อมเสร็จแล้ว",
    value: 120,
    description: "ดำเนินการเสร็จสิ้น",
    bgColor: "bg-green-100",
    textColor: "text-green-600",
    icon: CheckCircle2,
  },
];