import {
  BellOutlined,
  SearchOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  CrownOutlined,
  ReloadOutlined,
  SettingOutlined,
  LogoutOutlined,
  ProfileOutlined,
} from "@ant-design/icons";

import {
  Input,
  Badge,
  Avatar,
  Dropdown,
  Button,
} from "antd";

import { useLocation } from "react-router-dom";

export default function Header() {
  const location = useLocation();

  // ==========================
  // Page Title
  // ==========================
  const titles = {
    "/dashboard": "Dashboard",
    "/reports": "Priority Reports",
    "/ai": "AI Analysis",
    "/analytics": "Analytics",
    "/map": "GIS Map",
    "/users": "Users",
    "/settings": "Settings",
  };

  const pageTitle = titles[location.pathname] || "Dashboard";

  // ==========================
  // Current Date
  // ==========================

  const today = new Date();

  const currentDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ==========================
  // Notification Dropdown
  // ==========================

  

  // ==========================
  // User Dropdown
  // ==========================

  const profileItems = [
    {
      key: "1",
      icon: <ProfileOutlined />,
      label: "Profile",
    },
    {
      key: "2",
      icon: <SettingOutlined />,
      label: "Settings",
    },
    {
      type: "divider",
    },
    {
      key: "3",
      danger: true,
      icon: <LogoutOutlined />,
      label: "Logout",
    },
  ];

  return (
    <header className="sticky top-0 z-50 h-20 bg-white border-b border-gray-200 shadow-sm px-6 flex items-center justify-between">

      {/* Left */}
      <div className="flex items-center gap-5">

        {/* Page */}
        <div>

          <div className="flex items-center gap-3">

            <h1 className="text-2xl font-bold text-slate-800">
              {pageTitle}
            </h1>

            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold uppercase">

              <CrownOutlined />

              Admin

            </span>

          </div>

          <p className="text-xs text-gray-500">
            Smart Road Monitoring System • {currentDate}
          </p>

        </div>

      </div>

      {/* Right */}
      <div className="flex items-center gap-4">

        {/* User */}

        <Dropdown
          menu={{ items: profileItems }}
          trigger={["click"]}
        >

          <div className="flex items-center gap-3 cursor-pointer border rounded-xl px-3 py-2 hover:bg-gray-50 transition">

            <Avatar
              size={42}
              icon={<UserOutlined />}
              style={{
                background: "#FFF3E0",
                color: "#F59E0B",
              }}
            />

            <div className="hidden md:block leading-5">

              <h4 className="font-semibold text-slate-800">
                Admin
              </h4>

              <p className="text-xs text-gray-500">
                Highway Engineer
              </p>

            </div>

          </div>

        </Dropdown>

      </div>

    </header>
  );
}