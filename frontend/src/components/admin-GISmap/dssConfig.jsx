import {
    ThunderboltOutlined,
    TeamOutlined,
    DollarOutlined,
    SafetyCertificateOutlined,
} from "@ant-design/icons";

export const DSS_PRESETS = [
    {
      id: "balanced",
      name: "สมดุลทั่วไป",
      subName: "Balanced Baseline",
      icon: <SafetyCertificateOutlined />,
      color: "#3B82F6", // Blue
      bg: "#EFF6FF",
      border: "#BFDBFE",
      description: "งานซ่อมบำรุงตามรอบปกติ",
      weights: { w_ppi: 0.8, w_cus: 0.2, w_c: 0.3, w_d: 0.25, w_r: 0.25, w_n: 0.2 },
    },
    {
      id: "safety",
      name: "ความปลอดภัยเร่งด่วน",
      subName: "Safety & Emergency",
      icon: <ThunderboltOutlined />,
      color: "#EF4444", // Red
      bg: "#FEF2F2",
      border: "#FECACA",
      description: "เน้นถนนหลักเสี่ยงอุบัติเหตุ",
      weights: { w_ppi: 0.9, w_cus: 0.1, w_c: 0.15, w_d: 0.25, w_r: 0.2, w_n: 0.4 },
    },
    {
      id: "citizen",
      name: "เสียงสะท้อนชุมชน",
      subName: "Citizen Focus",
      icon: <TeamOutlined />,
      color: "#8B5CF6", // Purple
      bg: "#F5F3FF",
      border: "#DDD6FE",
      description: "ตอบสนองข้อร้องเรียนรวดเร็ว",
      weights: { w_ppi: 0.6, w_cus: 0.4, w_c: 0.45, w_d: 0.15, w_r: 0.3, w_n: 0.1 },
    },
    {
      id: "cost",
      name: "ประสิทธิภาพงบประมาณ",
      subName: "Cost & Cluster",
      icon: <DollarOutlined />,
      color: "#10B981", // Green
      bg: "#ECFDF5",
      border: "#A7F3D0",
      description: "เน้นจุดเสียหายกระจุกตัวสูง",
      weights: { w_ppi: 0.75, w_cus: 0.25, w_c: 0.2, w_d: 0.5, w_r: 0.15, w_n: 0.15 },
    },
  ];
  
export const DEFAULT_DSS_WEIGHTS = DSS_PRESETS[0].weights;
