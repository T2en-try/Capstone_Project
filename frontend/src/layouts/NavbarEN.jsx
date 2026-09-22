import React from "react";
import { Link, NavLink } from "react-router-dom";
import {
  BarChartOutlined,
  MessageOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  UserOutlined,
  MenuOutlined,
  CloseOutlined,
} from "@ant-design/icons";

export default function Navbar() {
  // Define all menu items inside the component
  const menus = [
    { label: "Statistics", href: "/", icon: BarChartOutlined },
    // { label: "Comments", href: "/comments", icon: MessageOutlined },
    { label: "Report an Issue", href: "/report", icon: WarningOutlined },
    // { label: "SmartRoad Information Center", href: "/info", icon: InfoCircleOutlined },
  ];

  return (
    <nav className="w-full bg-white border-b shadow-sm relative z-50">
      <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-8">

        {/* Logo - Click to return to the home page */}
        <Link
          to="/"
          className="text-xl font-extrabold text-orange-500 tracking-wide hover:opacity-90 transition"
        >
          Road<span className="text-gray-800">Monitor</span>
        </Link>

        {/* Menu Items — Desktop */}
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

        <div className="flex items-center gap-3">
          {/* Login Button - Hidden on mobile because it is available in the Bottom Nav */}
          <Link
            to="/login"
            className="hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
            title="Login"
          >
            <UserOutlined className="text-lg" />
          </Link>
        </div>

      </div>
    </nav>
  );
}