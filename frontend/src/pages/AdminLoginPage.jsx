import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Form, Input, Button, message } from "antd";
import {
  LockOutlined,
  MailOutlined,
  UserOutlined,
  HomeOutlined,
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
    <div className="min-h-screen bg-slate-50 px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500 text-white mb-4 shadow-sm">
            <UserOutlined style={{ fontSize: 24 }} />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">ลงชื่อเข้าใช้</h1>
          <p className="text-sm text-slate-500 mt-1">กรอกข้อมูลเพื่อเข้าสู่ระบบสำหรับผู้ดูแลระบบ</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
              rules={[
                { required: true, message: "กรุณากรอกอีเมล" },
                { type: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" },
              ]}
            >
              <Input
                prefix={<MailOutlined className="text-slate-400" />}
                placeholder="อีเมล"
                className="!bg-slate-50 !border-slate-200 !text-slate-700 placeholder:!text-slate-400 hover:!border-slate-400 focus:!border-slate-500"
                style={{ height: 44, borderRadius: 14 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: "กรุณากรอกรหัสผ่าน" }]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-slate-400" />}
                placeholder="รหัสผ่าน"
                className="!bg-slate-50 !border-slate-200 !text-slate-700 placeholder:!text-slate-400 hover:!border-slate-400 focus:!border-slate-500"
                style={{ height: 52, borderRadius: 14 }}
              />
            </Form.Item>

            <Form.Item className="mb-0 mt-6">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="border-0 text-white"
                style={{
                  height: 44,
                  borderRadius: 12,
                  fontWeight: 600,
                  background: "#F59E0B",
                }}
              >
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </Button>
            </Form.Item>
          </Form>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-slate-500 hover:text-amber-600 transition-colors flex items-center justify-center gap-1">
            <HomeOutlined />
            <span>กลับหน้าหลัก</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
