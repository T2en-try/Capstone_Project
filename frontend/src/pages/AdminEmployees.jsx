import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined, ReloadOutlined, UserOutlined } from "@ant-design/icons";

import {
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  updateEmployee,
} from "../services/employeeService";

const { Title, Text } = Typography;

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      setEmployees(await fetchEmployees());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return employees;
    return employees.filter((employee) =>
      `${employee.email} ${employee.role}`.toLowerCase().includes(keyword)
    );
  }, [employees, search]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ role: "officer", is_active: true });
    setModalOpen(true);
  };

  const openEdit = (employee) => {
    setEditing(employee);
    form.setFieldsValue({ role: employee.role, is_active: Boolean(employee.is_active) });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      setSaving(true);
      if (editing) {
        await updateEmployee(editing.id, {
          password: values.password || undefined,
          role: values.role,
          is_active: values.is_active ? 1 : 0,
        });
      } else {
        await createEmployee({ email: values.email, password: values.password, role: values.role });
      }
      setModalOpen(false);
      await loadEmployees();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (employee) => {
    Modal.confirm({
      title: "ลบพนักงานนี้หรือไม่?",
      content: employee.email,
      okText: "ลบ",
      okType: "danger",
      cancelText: "ยกเลิก",
      onOk: async () => {
        await deleteEmployee(employee.id);
        await loadEmployees();
      },
    });
  };

  const columns = [
    { title: "อีเมล", dataIndex: "email", key: "email" },
    {
      title: "บทบาท",
      dataIndex: "role",
      key: "role",
      render: (role) => <Tag color={role === "admin" ? "blue" : "green"}>{role}</Tag>,
    },
    {
      title: "สถานะ",
      dataIndex: "is_active",
      key: "is_active",
      render: (active) => <Tag color={active ? "success" : "default"}>{active ? "ใช้งาน" : "ปิดใช้งาน"}</Tag>,
    },
    {
      title: "เข้าสู่ระบบล่าสุด",
      dataIndex: "last_login",
      key: "last_login",
      render: (value) => value ? new Date(value).toLocaleString("th-TH") : "ยังไม่เคยเข้าใช้",
    },
    {
      title: "จัดการ",
      key: "actions",
      render: (_, employee) => (
        <Space>
          <Button onClick={() => openEdit(employee)}>แก้ไข</Button>
          <Button danger onClick={() => handleDelete(employee)}>ลบ</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card bordered={false} style={{ borderRadius: 16, marginBottom: 20 }}>
        <Space align="start">
          <UserOutlined style={{ fontSize: 32, color: "#1677ff", marginTop: 6 }} />
          <div>
            <Title level={2} style={{ margin: 0 }}>Employees</Title>
            <Text type="secondary">จัดการบัญชีเจ้าหน้าที่จากฐานข้อมูลระบบ</Text>
          </div>
        </Space>
      </Card>

      {error && <Alert type="error" showIcon message={error} closable onClose={() => setError(null)} style={{ marginBottom: 16 }} />}

      <Card
        bordered={false}
        style={{ borderRadius: 16 }}
        title={`พนักงานทั้งหมด ${employees.length} คน`}
        extra={(
          <Space>
            <Input placeholder="ค้นหาอีเมลหรือบทบาท" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Button icon={<ReloadOutlined />} onClick={loadEmployees} loading={loading} />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>เพิ่มพนักงาน</Button>
          </Space>
        )}
      >
        <Table rowKey="id" columns={columns} dataSource={filteredEmployees} loading={loading} scroll={{ x: 760 }} />
      </Card>

      <Modal
        title={editing ? "แก้ไขพนักงาน" : "เพิ่มพนักงาน"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ role: "officer", is_active: true }}>
          {!editing && <Form.Item name="email" label="อีเมล" rules={[{ required: true, type: "email", message: "กรุณากรอกอีเมล" }]}><Input /></Form.Item>}
          <Form.Item name="password" label={editing ? "รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)" : "รหัสผ่าน"} rules={[{ required: !editing, min: 8, message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }]}><Input.Password /></Form.Item>
          <Form.Item name="role" label="บทบาท" rules={[{ required: true }]}><Select options={[{ value: "officer", label: "เจ้าหน้าที่" }, { value: "admin", label: "ผู้ดูแลระบบ" }]} /></Form.Item>
          {editing && <Form.Item name="is_active" label="สถานะ" valuePropName="checked"><Switch checkedChildren="ใช้งาน" unCheckedChildren="ปิดใช้งาน" /></Form.Item>}
        </Form>
      </Modal>
    </div>
  );
}