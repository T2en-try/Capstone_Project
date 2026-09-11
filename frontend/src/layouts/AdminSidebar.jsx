import { useState } from "react";
import { Menu, Tooltip } from "antd";
import {
  DashboardOutlined,
  FileTextOutlined,
  RobotOutlined,
  EnvironmentOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);

  /* =========================================================
     Menu
  ========================================================= */

  const menuItems = [
    {
      key: "/admin/dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
    },
    {
      key: "/admin/priority-reports",
      icon: <FileTextOutlined />,
      label: "Priority Reports",
    },
    {
      key: "/admin/ai",
      icon: <RobotOutlined />,
      label: "AI Analysis",
    },
    {
      key: "/admin/map",
      icon: <EnvironmentOutlined />,
      label: "GIS Map",
    },
    {
      key: "/admin/employees",
      icon: <UserOutlined />,
      label: "Employees",
    },
  ];

  /* =========================================================
     Active Menu
  ========================================================= */

  const getSelectedKey = () => {
    const path = location.pathname;

    if (path === "/admin/dashboard") {
      return "/admin/dashboard";
    }

    if (path.startsWith("/admin/priority-reports")) {
      return "/admin/priority-reports";
    }

    if (path.startsWith("/admin/ai")) {
      return "/admin/ai";
    }

    if (path.startsWith("/admin/map")) {
      return "/admin/map";
    }

    if (path.startsWith("/admin/employees")) {
      return "/admin/employees";
    }

    return "/admin/dashboard";
  };

  /* =========================================================
     Menu Item With Tooltip
  ========================================================= */

  const renderMenuItems = (items) =>
    items.map((item) => ({
      ...item,
      label: collapsed ? (
        <Tooltip
          title={item.label}
          placement="right"
        >
          <span className="sidebar-menu-tooltip">
            {item.label}
          </span>
        </Tooltip>
      ) : (
        item.label
      ),
    }));

  /* =========================================================
     Render
  ========================================================= */

  return (
    <aside
      className={`
        admin-sidebar
        ${collapsed ? "admin-sidebar-collapsed" : ""}
      `}
    >
      {/* =====================================================
          Brand
      ===================================================== */}

      <div className="sidebar-brand">
        <div className="sidebar-brand-inner">

          {/* Logo */}
         <div className="sidebar-logo official-logo">
  <div className="official-logo-inner">
    <span>RM</span>
  </div>
</div>

          {/* Brand Text */}
          {!collapsed && (
            <div className="sidebar-brand-text">
              <h1>RoadMonitor</h1>

              <span>
                ADMIN CONSOLE
              </span>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          Menu Label
      ===================================================== */}

      {!collapsed && (
        <div className="sidebar-section-label">
          MAIN MENU
        </div>
      )}

      {/* =====================================================
          Menu
      ===================================================== */}

      <Menu
        mode="inline"
        theme="light"
        inlineCollapsed={collapsed}
        selectedKeys={[getSelectedKey()]}
        items={renderMenuItems(menuItems)}
        onClick={({ key }) => navigate(key)}
        className="admin-sidebar-menu"
      />

      {/* =====================================================
          Bottom
      ===================================================== */}

      {!collapsed && (
        <div className="sidebar-bottom">
          <div className="sidebar-system">

            <div className="sidebar-system-icon">
              <SafetyCertificateOutlined />
            </div>

            <div>
              <div className="sidebar-system-title">
                Road Monitor System
              </div>

              <div className="sidebar-system-subtitle">
                Admin Panel
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =====================================================
          Collapse Button
      ===================================================== */}

      <button
        type="button"
        className="sidebar-collapse-button"
        onClick={() =>
          setCollapsed((value) => !value)
        }
        aria-label={
          collapsed
            ? "ขยาย Sidebar"
            : "ย่อ Sidebar"
        }
      >
        {collapsed ? (
          <RightOutlined />
        ) : (
          <LeftOutlined />
        )}
      </button>

      {/* =====================================================
          Styling
      ===================================================== */}

      <style>
        {`

          /* =================================================
             Sidebar
          ================================================= */

          .admin-sidebar {
            position: sticky;
            top: 0;

            width: 250px;
            min-width: 250px;
            height: 100vh;

            display: flex;
            flex-direction: column;

            background: #FFFFFF;

            border-right:
              1px solid #DCE5E1;

            transition:
              width 0.2s ease,
              min-width 0.2s ease;

            z-index: 100;

            box-shadow:
              4px 0 18px
              rgba(20, 53, 47, 0.035);
          }

          /* =================================================
             Collapsed
          ================================================= */

          .admin-sidebar-collapsed {
            width: 72px;
            min-width: 72px;
          }

          /* =================================================
             Brand
          ================================================= */

          .sidebar-brand {
            height: 82px;

            display: flex;
            align-items: center;

            padding:
              0 16px;

            border-bottom:
              1px solid #DCE5E1;

            overflow: hidden;
          }

          .sidebar-brand-inner {
            width: 100%;

            display: flex;
            align-items: center;

            gap: 11px;
          }

          .sidebar-logo {
            width: 40px;
            min-width: 40px;
            height: 40px;

            display: flex;
            align-items: center;
            justify-content: center;

            border-radius: 10px;

            background: #14352F;

            color: #E6A817;

            font-size: 19px;

            box-shadow:
              0 4px 12px
              rgba(20, 53, 47, 0.12);
          }

          .sidebar-brand-text {
            min-width: 0;
            overflow: hidden;
            white-space: nowrap;
          }

          .sidebar-brand-text h1 {
            margin: 0;

            color: #14352F;

            font-family:
              Kanit,
              sans-serif;

            font-size: 17px;
            font-weight: 600;

            line-height: 1.2;
          }

          .sidebar-brand-text span {
            display: block;

            margin-top: 4px;

            color: #66736F;

            font-family:
              Sarabun,
              sans-serif;

            font-size: 9px;
            font-weight: 600;

            letter-spacing: 1.3px;
          }

          /* =================================================
             Collapsed Brand
          ================================================= */

          .admin-sidebar-collapsed
            .sidebar-brand {
            padding: 0 16px;

            justify-content: center;
          }

          .admin-sidebar-collapsed
            .sidebar-brand-inner {
            justify-content: center;
          }

          /* =================================================
             Section Label
          ================================================= */

          .sidebar-section-label {
            padding:
              20px 15px 7px;

            color: #7A8581;

            font-family:
              Sarabun,
              sans-serif;

            font-size: 10px;
            font-weight: 700;

            letter-spacing: 1.1px;
          }

          /* =================================================
             Menu
          ================================================= */

          .admin-sidebar-menu {
            flex: 1;

            width: 100%;

            padding:
              4px 10px;

            border: none !important;

            background:
              transparent !important;
          }

          .admin-sidebar-menu
            .ant-menu-item {
            height: 44px !important;

            line-height: 44px !important;

            margin:
              3px 0 !important;

            padding:
              0 12px !important;

            border-radius:
              8px !important;

            color: #66736F !important;

            font-family:
              Sarabun,
              sans-serif !important;

            font-size: 13px !important;

            font-weight: 500 !important;

            transition:
              all 0.15s ease;
          }

          /* =================================================
             Icon
          ================================================= */

          .admin-sidebar-menu
            .ant-menu-item
            .ant-menu-item-icon {
            width: 20px !important;
            min-width: 20px !important;

            margin-right: 10px !important;

            color: #7B8883 !important;

            font-size: 16px !important;

            transition:
              color 0.15s ease;
          }

          /* =================================================
             Hover
          ================================================= */

          .admin-sidebar-menu
            .ant-menu-item:hover {
            color:
              #14352F !important;

            background:
              #F5F7F6 !important;
          }

          .admin-sidebar-menu
            .ant-menu-item:hover
            .ant-menu-item-icon {
            color:
              #C48A0A !important;
          }

          /* =================================================
             Selected
          ================================================= */

          .admin-sidebar-menu
            .ant-menu-item-selected {
            color:
              #14352F !important;

            background:
              #FFF9E8 !important;

            font-weight:
              600 !important;
          }

          .admin-sidebar-menu
            .ant-menu-item-selected
            .ant-menu-item-icon {
            color:
              #C48A0A !important;
          }

          /* =================================================
             Selected Indicator
          ================================================= */

          .admin-sidebar-menu
            .ant-menu-item-selected::before {
            content: "";

            position: absolute;

            left: 0;
            top: 8px;
            bottom: 8px;

            width: 3px;

            border-radius:
              0 4px 4px 0;

            background:
              #E6A817;
          }

          .admin-sidebar-menu
            .ant-menu-item::after {
            display: none !important;
          }

          /* =================================================
             Collapsed Menu
          ================================================= */

          .admin-sidebar-collapsed
            .admin-sidebar-menu {
            padding:
              4px 10px;
          }

          .admin-sidebar-collapsed
            .admin-sidebar-menu
            .ant-menu-item {
            width: 50px !important;

            margin:
              4px auto !important;

            padding:
              0 !important;

            display: flex;

            align-items: center;
            justify-content: center;

            border-radius: 9px !important;
          }

          .admin-sidebar-collapsed
            .admin-sidebar-menu
            .ant-menu-item
            .ant-menu-item-icon {
            margin:
              0 !important;

            font-size:
              18px !important;
          }

          .admin-sidebar-collapsed
            .admin-sidebar-menu
            .ant-menu-title-content {
            display: none;
          }

          /* =================================================
             Bottom
          ================================================= */

          .sidebar-bottom {
            padding:
              14px 14px 18px;

            border-top:
              1px solid #DCE5E1;
          }

          .sidebar-system {
            display: flex;

            align-items: center;

            gap: 9px;

            padding:
              8px 7px;
          }

          .sidebar-system-icon {
            width: 30px;
            min-width: 30px;
            height: 30px;

            display: flex;

            align-items: center;
            justify-content: center;

            border-radius: 7px;

            background:
              #F7FAF8;

            color:
              #1F4A42;

            font-size: 14px;
          }

          .sidebar-system-title {
            color:
              #14352F;

            font-family:
              Sarabun,
              sans-serif;

            font-size: 11px;

            font-weight: 600;

            white-space: nowrap;
          }

          .sidebar-system-subtitle {
            margin-top: 1px;

            color:
              #8A9692;

            font-family:
              Sarabun,
              sans-serif;

            font-size: 9px;
          }

          /* =================================================
             Collapse Button
          ================================================= */

          .sidebar-collapse-button {
            position: absolute;

            right: -13px;

            top: 68px;

            width: 26px;
            height: 26px;

            display: flex;

            align-items: center;
            justify-content: center;

            border:
              1px solid #DCE5E1;

            border-radius: 50%;

            background:
              #FFFFFF;

            color:
              #66736F;

            font-size: 10px;

            cursor: pointer;

            box-shadow:
              0 2px 8px
              rgba(20, 53, 47, 0.08);

            z-index: 110;

            transition:
              all 0.15s ease;
          }

          .sidebar-collapse-button:hover {
            color:
              #C48A0A;

            border-color:
              #E6A817;

            background:
              #FFF9E8;
          }

          /* =================================================
             Tooltip
          ================================================= */

          .sidebar-menu-tooltip {
            display: block;

            width: 100%;
            height: 100%;
          }

          /* =================================================
             Responsive
          ================================================= */

          @media (max-width: 900px) {

            .admin-sidebar {
              width: 72px;
              min-width: 72px;
            }

            .sidebar-brand {
              padding: 0 16px;
              justify-content: center;
            }

            .sidebar-brand-inner {
              justify-content: center;
            }

            .sidebar-brand-text,
            .sidebar-section-label,
            .sidebar-bottom {
              display: none;
            }

            .admin-sidebar-menu
              .ant-menu-item {
              width: 50px !important;
              margin: 4px auto !important;
              padding: 0 !important;
              justify-content: center;
            }

            .admin-sidebar-menu
              .ant-menu-item
              .ant-menu-item-icon {
              margin: 0 !important;
              font-size: 18px !important;
            }

            .admin-sidebar-menu
              .ant-menu-title-content {
              display: none;
            }

            .sidebar-collapse-button {
              display: none;
            }
          }
        `}
      </style>
    </aside>
  );
}