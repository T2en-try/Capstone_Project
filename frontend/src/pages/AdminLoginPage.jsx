import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Form, Input, Button, message } from "antd";
import {
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { login } from "../services/authService";

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success("เข้าสู่ระบบสำเร็จ");
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      message.error(err.message || "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
         style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
             style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)" }} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-8"
             style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }} />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-5"
             style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }} />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
             style={{
               backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
               backgroundSize: "40px 40px",
             }} />
      </div>

      {/* Back to home */}
      <Link to="/"
            className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm z-10">
        <ArrowLeftOutlined />
        <span>กลับหน้าหลัก</span>
      </Link>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md mx-4">

        {/* Logo section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5"
               style={{
                 background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                 boxShadow: "0 8px 32px rgba(245,158,11,0.3)",
               }}>
            <SafetyCertificateOutlined style={{ fontSize: 36, color: "#fff" }} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Road<span className="text-amber-400">Monitor</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            ระบบจัดการสำหรับผู้ดูแลระบบ
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 border"
             style={{
               background: "rgba(30, 41, 59, 0.8)",
               borderColor: "rgba(148, 163, 184, 0.15)",
               backdropFilter: "blur(24px)",
               boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
             }}>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">เข้าสู่ระบบ</h2>
            <p className="text-slate-400 text-sm mt-1">กรอกข้อมูลเพื่อเข้าใช้งานแดชบอร์ด</p>
          </div>

          <Form
            name="admin-login"
            layout="vertical"
            onFinish={onFinish}
            autoComplete="off"
            requiredMark={false}
            size="large"
          >
            <Form.Item
              name="email"
              label={<span className="text-slate-300 text-sm font-medium">อีเมล</span>}
              rules={[
                { required: true, message: "กรุณากรอกอีเมล" },
                { type: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" },
              ]}
            >
              <Input
                prefix={<MailOutlined className="text-slate-500" />}
                placeholder="admin@roadmonitor.com"
                className="!bg-slate-700/50 !border-slate-600 !text-white placeholder:!text-slate-500 hover:!border-amber-500 focus:!border-amber-500"
                style={{ height: 48, borderRadius: 12 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-slate-300 text-sm font-medium">รหัสผ่าน</span>}
              rules={[{ required: true, message: "กรุณากรอกรหัสผ่าน" }]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-slate-500" />}
                placeholder="กรอกรหัสผ่าน"
                className="!bg-slate-700/50 !border-slate-600 !text-white placeholder:!text-slate-500 hover:!border-amber-500 focus:!border-amber-500"
                style={{ height: 48, borderRadius: 12 }}
              />
            </Form.Item>

            <Form.Item className="mb-0 mt-8">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 50,
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 16,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  border: "none",
                  boxShadow: "0 4px 16px rgba(245,158,11,0.3)",
                }}
              >
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </Button>
            </Form.Item>
          </Form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Smart Road Monitoring System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
