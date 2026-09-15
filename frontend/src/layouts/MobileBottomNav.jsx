import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChartOutlined,
  WarningOutlined,
  UserOutlined,
} from "@ant-design/icons";

export default function MobileBottomNav() {
  const menus = [
    { label: "หน้าหลัก", href: "/", icon: BarChartOutlined },
    { label: "แจ้งปัญหา", href: "/report", icon: WarningOutlined },
    { label: "เจ้าหน้าที่", href: "/login", icon: UserOutlined },
  ];

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!window.visualViewport) return;
    
    const handleResize = () => {
      // If viewport height shrinks by more than 150px, keyboard is likely open
      const heightDiff = window.innerHeight - window.visualViewport.height;
      setIsKeyboardOpen(heightDiff > 150);
    };

    window.visualViewport.addEventListener("resize", handleResize);
    return () => window.visualViewport.removeEventListener("resize", handleResize);
  }, []);

  if (isKeyboardOpen) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {menus.map((menu) => {
          const Icon = menu.icon;

          return (
            <NavLink
              key={menu.href}
              to={menu.href}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive
                    ? "text-orange-500"
                    : "text-gray-500 hover:text-gray-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`text-xl ${
                      isActive ? "scale-110" : ""
                    } transition-transform`}
                  />
                  <span
                    className={`text-[10px] ${
                      isActive ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {menu.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
