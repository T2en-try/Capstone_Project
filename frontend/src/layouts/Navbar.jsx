import React from "react";
import {
  BarChartOutlined,
  MessageOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";

const menus = [
  { label: "สถิติ", href: "/", icon: <BarChartOutlined /> },
  { label: "แสดงความเห็น", href: "/comments", icon: <MessageOutlined /> },
  { label: "แจ้งปัญหา", href: "https://page.line.me/traffyfondue", icon: <WarningOutlined /> },
  { label: "ศูนย์ข้อมูล SmartRoad", href: "/info", icon: <InfoCircleOutlined /> },
];

export default function Navbar() {
  return (
    <nav className="w-full bg-white border-b shadow-sm">
      <div className="mx-auto flex h-16 items-center justify-between px-8">

        {/* Logo */}
       <div className="text-xl font-extrabold text-orange-500 tracking-wide">
            Road<span className="text-gray-800">Monitor</span>
        </div>

        {/* Menu */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700">
          {menus.map((menu) => (
            <a
                key={menu.href}
                href={menu.href}
                className="flex items-center gap-2 transition hover:text-orange-500"
            >
                {menu.icon}
                <span>{menu.label}</span>
            </a>
            ))}
        </div>

        {/* Login */}
        <a
          href="/login"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
        >
          👤
        </a>

      </div>
    </nav>
  );
}