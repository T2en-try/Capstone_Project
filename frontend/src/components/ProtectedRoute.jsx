import React, { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated, getMe } from "../services/authService";

/**
 * ProtectedRoute — ตรวจสอบสิทธิ์ก่อนเข้า Admin routes
 * ถ้าไม่มี token → redirect ไปหน้า /login
 */
export default function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    async function verify() {
      if (!isAuthenticated()) {
        setAuthed(false);
        setChecking(false);
        return;
      }

      // ตรวจสอบ token กับ server
      const admin = await getMe();
      setAuthed(!!admin);
      setChecking(false);
    }

    verify();
  }, [location.pathname]);

  // กำลังตรวจสอบ → แสดง loading
  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-gray-500 text-sm">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  // ไม่ผ่านการตรวจสอบ → redirect ไป /login
  if (!authed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
