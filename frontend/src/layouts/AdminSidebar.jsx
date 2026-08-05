import { Menu } from "antd";
import {
  DashboardOutlined,
  FileTextOutlined,
  RobotOutlined,
  BarChartOutlined,
  EnvironmentOutlined,
  UserOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  const menuItems = [
    {
      key: "/admin/dashboard",
      icon: <DashboardOutlined />,
      label: <Link to="/admin/dashboard" className="font-medium">Dashboard</Link>,
    },
    {
      key: "/admin/priority-reports",
      icon: <FileTextOutlined />,
      label: <Link to="/admin/priority-reports" className="font-medium">Priority Reports</Link>,
    },
    {
      key: "/admin/ai",
      icon: <RobotOutlined />,
      label: <Link to="/admin/ai" className="font-medium">AI Analysis</Link>,
    },
    {
      key: "/admin/analytics",
      icon: <BarChartOutlined />,
      label: <Link to="/admin/analytics" className="font-medium">Analytics</Link>,
    },
    {
      key: "/admin/map",
      icon: <EnvironmentOutlined />,
      label: <Link to="/admin/map" className="font-medium">GIS Map</Link>,
    },
    {
      key: "/admin/employees",
      icon: <UserOutlined />,
      label: <Link to="/admin/employees" className="font-medium">Employees</Link>,
    },
    {
      key: "/admin/settings",
      icon: <SettingOutlined />,
      label: <Link to="/admin/settings" className="font-medium">Settings</Link>,
    },
  ];

  return (
    <div className=" w-64 border-r border-line bg-paper text-asphalt flex flex-col shadow-[0_0_30px_rgba(20,53,47,0.08)]">
      <div className="px-5 py-6 border-b border-line">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-semibold text-ink">RoadMonitor</h1>
          </div>
        </div>

      </div>
      <Menu
        mode="inline"
        theme="light"
        selectedKeys={[location.pathname]}
        className="admin-sidebar-menu mt-3 flex-1 px-2"
        style={{
          background: "transparent",
          border: "none",
          flex: 1,
        }}
        items={menuItems}
      />
    </div>
  );
}