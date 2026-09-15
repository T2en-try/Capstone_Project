import { useState } from "react";
import Sidebar from "./AdminSidebar";
import Header from "./AdminHeader";
import { Outlet } from "react-router-dom";

export default function AdminLayout() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-100">

      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileDrawerOpen}
        onMobileClose={() => setMobileDrawerOpen(false)}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        <Header onMenuClick={() => setMobileDrawerOpen(true)} />

        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          <Outlet />
        </main>

      </div>

    </div>
  );
}