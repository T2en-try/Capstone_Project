import React from "react";
import { Link, NavLink } from "react-router-dom";
import {
  BarChartOutlined,
  MessageOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";

export default function Navbar() {
  // นิยามรายการเมนูทั้งหมดภายใน Component
  const menus = [
    { label: "สถิติ", href: "/", icon: BarChartOutlined },
    { label: "แสดงความเห็น", href: "/comments", icon: MessageOutlined },
    { label: "แจ้งปัญหา", href: "/report", icon: WarningOutlined }, // 👈 นำทางไปหน้า Report
    { label: "ศูนย์ข้อมูล SmartRoad", href: "/info", icon: InfoCircleOutlined },
  ];

  return (
    <nav className="w-full bg-white border-b shadow-sm">
      <div className="mx-auto flex h-16 items-center justify-between px-8">

        {/* Logo - คลิกแล้วกลับหน้าหลัก */}
        <Link
          to="/"
          className="text-xl font-extrabold text-orange-500 tracking-wide hover:opacity-90 transition"
        >
          Road<span className="text-gray-800">Monitor</span>
        </Link>

        {/* Menu Items */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          {menus.map((menu) => {
            const Icon = menu.icon;

            return (
              <NavLink
                key={menu.href}
                to={menu.href}
                className={({ isActive }) =>
                  `flex items-center gap-2 transition ${
                    isActive
                      ? "text-orange-500 font-semibold"
                      : "text-gray-700 hover:text-orange-500"
                  }`
                }
              >
                <Icon />
                <span>{menu.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Login Button */}
        <Link
          to="/login"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
          title="เข้าสู่ระบบ"
        >
          <UserOutlined className="text-lg" />
        </Link>

      </div>
    </nav>
  );
}