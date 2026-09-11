import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Button,
  Divider,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Row,
  Col,
} from "antd";

import {
  PlusOutlined,
  ReloadOutlined,
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
  ApartmentOutlined,
  SafetyOutlined,
  LockOutlined,
} from "@ant-design/icons";

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

  // =====================================================
  // Load Employees
  // =====================================================

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchEmployees();

      setEmployees(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.error("Load employees error:", loadError);

      setError(
        loadError?.message ||
          "ไม่สามารถโหลดข้อมูลพนักงานได้"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // =====================================================
  // Search
  // =====================================================

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return employees;
    }

    return employees.filter((employee) => {
      const text = [
        employee.employee_code,
        employee.first_name,
        employee.last_name,
        employee.email,
        employee.phone,
        employee.department,
        employee.position,
        employee.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(keyword);
    });
  }, [employees, search]);

  // =====================================================
  // Open Create
  // =====================================================

  const openCreate = () => {
    setEditing(null);

    form.resetFields();

    form.setFieldsValue({
      role: "officer",
      is_active: true,
    });

    setModalOpen(true);
  };

  // =====================================================
  // Open Edit
  // =====================================================

  const openEdit = (employee) => {
    setEditing(employee);

    form.resetFields();

    form.setFieldsValue({
      employee_code: employee.employee_code,
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      role: employee.role,
      is_active: Boolean(employee.is_active),
      password: "",
    });

    setModalOpen(true);
  };

  // =====================================================
  // Close Modal
  // =====================================================

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  // =====================================================
  // Submit
  // =====================================================

  const handleSubmit = async (values) => {
    try {
      setSaving(true);
      setError(null);

      // =================================================
      // Edit
      // =================================================

      if (editing) {
        const payload = {
          employee_code:
            values.employee_code?.trim() || null,

          first_name:
            values.first_name?.trim() || null,

          last_name:
            values.last_name?.trim() || null,

          phone:
            values.phone?.trim() || null,

          department:
            values.department?.trim() || null,

          position:
            values.position?.trim() || null,

          role: values.role,

          is_active: values.is_active ? 1 : 0,
        };

        if (values.password) {
          payload.password = values.password;
        }

        await updateEmployee(
          editing.id,
          payload
        );

        Modal.success({
          title: "แก้ไขข้อมูลสำเร็จ",
          content:
            "ข้อมูลพนักงานถูกแก้ไขเรียบร้อยแล้ว",
        });
      }

      // =================================================
      // Create
      // =================================================

      else {
        const payload = {
          employee_code:
            values.employee_code?.trim() || null,

          first_name:
            values.first_name?.trim() || null,

          last_name:
            values.last_name?.trim() || null,

          email:
            values.email?.trim().toLowerCase(),

          phone:
            values.phone?.trim() || null,

          department:
            values.department?.trim() || null,

          position:
            values.position?.trim() || null,

          password: values.password,

          role: values.role,
        };

        await createEmployee(payload);

        Modal.success({
          title: "เพิ่มพนักงานสำเร็จ",
          content:
            "เพิ่มพนักงานเข้าสู่ระบบเรียบร้อยแล้ว",
        });
      }

      setModalOpen(false);
      setEditing(null);
      form.resetFields();

      await loadEmployees();
    } catch (saveError) {
      console.error(
        "Save employee error:",
        saveError
      );

      setError(
        saveError?.message ||
          "ไม่สามารถบันทึกข้อมูลพนักงานได้"
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // Delete
  // =====================================================

  const handleDelete = (employee) => {
    Modal.confirm({
      title: "ลบพนักงานนี้หรือไม่?",

      content: (
        <section>
          <p className="mb-1">
            คุณกำลังจะลบบัญชี:
          </p>

          <strong>
            {employee.first_name ||
            employee.last_name
              ? `${employee.first_name || ""} ${
                  employee.last_name || ""
                }`.trim()
              : employee.email}
          </strong>

          <p className="text-gray-500 mt-1">
            {employee.email}
          </p>
        </section>
      ),

      okText: "ลบพนักงาน",
      okType: "danger",
      cancelText: "ยกเลิก",

      onOk: async () => {
        try {
          await deleteEmployee(employee.id);

          await loadEmployees();
        } catch (deleteError) {
          setError(
            deleteError?.message ||
              "ไม่สามารถลบพนักงานได้"
          );
        }
      },
    });
  };

  // =====================================================
  // Table Columns
  // =====================================================

  const columns = [
    {
      title: "พนักงาน",
      key: "employee",

      render: (_, employee) => {
        const fullName =
          `${employee.first_name || ""} ${
            employee.last_name || ""
          }`.trim();

        return (
          <span className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-600">
              <UserOutlined />
            </span>

            <span>
              <span className="block font-semibold text-slate-800">
                {fullName || "-"}
              </span>

              <span className="block text-xs text-gray-500">
                {employee.employee_code || "-"}
              </span>
            </span>
          </span>
        );
      },
    },

    {
      title: "อีเมล",
      dataIndex: "email",
      key: "email",

      render: (email) => (
        <span className="text-slate-600">
          {email}
        </span>
      ),
    },

    {
      title: "แผนก",
      dataIndex: "department",
      key: "department",

      render: (department) =>
        department || "-",
    },

    {
      title: "ตำแหน่ง",
      dataIndex: "position",
      key: "position",

      render: (position) =>
        position || "-",
    },

    {
      title: "บทบาท",
      dataIndex: "role",
      key: "role",

      render: (role) => (
        <Tag
          color={
            role === "admin"
              ? "orange"
              : "green"
          }
        >
          {role === "admin"
            ? "Admin"
            : "Officer"}
        </Tag>
      ),
    },

    {
      title: "สถานะ",
      dataIndex: "is_active",
      key: "is_active",

      render: (active) => (
        <Tag
          color={
            active
              ? "success"
              : "default"
          }
        >
          {active
            ? "ใช้งาน"
            : "ปิดใช้งาน"}
        </Tag>
      ),
    },

    {
      title: "เข้าสู่ระบบล่าสุด",
      dataIndex: "last_login",
      key: "last_login",

      render: (value) =>
        value
          ? new Date(value).toLocaleString(
              "th-TH"
            )
          : "ยังไม่เคยเข้าใช้",
    },

    {
      title: "จัดการ",
      key: "actions",

      render: (_, employee) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() =>
              openEdit(employee)
            }
          >
            แก้ไข
          </Button>

          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() =>
              handleDelete(employee)
            }
          >
            ลบ
          </Button>
        </Space>
      ),
    },
  ];

  // =====================================================
  // Render
  // =====================================================

  return (
    <>
      <section className="px-4 py-6">
        <section className="w-full">

          {/* =================================================
              Header
          ================================================= */}

          <section className="mb-6">
            <span className="flex items-center gap-4">
              <span className="flex items-center justify-center w-14 h-14 rounded-xl bg-amber-100 text-amber-600">
                <UserOutlined
                  style={{
                    fontSize: 28,
                  }}
                />
              </span>

              <span>
                <Title
                  level={2}
                  style={{
                    margin: 0,
                  }}
                >
                  Employees
                </Title>

                <Text type="secondary">
                  จัดการบัญชีเจ้าหน้าที่และผู้ดูแลระบบ
                </Text>
              </span>
            </span>
          </section>

          {/* =================================================
              Error
          ================================================= */}

          {error && (
            <Alert
              type="error"
              showIcon
              message={error}
              closable
              onClose={() =>
                setError(null)
              }
              className="mb-4"
            />
          )}

          {/* =================================================
              Employee Header
          ================================================= */}

          <section className="mb-4">
            <span className="flex items-end justify-between gap-4">
              <span>
                <span className="block text-lg font-semibold text-slate-800">
                  รายชื่อพนักงาน
                </span>

                <span className="block text-xs text-gray-500 mt-1">
                  ทั้งหมด {employees.length} คน
                </span>
              </span>

              <Space wrap>
                <Input
                  allowClear
                  placeholder="ค้นหาพนักงาน..."
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  style={{
                    width: 220,
                  }}
                />

                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadEmployees}
                  loading={loading}
                >
                  รีเฟรช
                </Button>

                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openCreate}
                  style={{
                    background: "#F59E0B",
                    borderColor: "#F59E0B",
                  }}
                >
                  เพิ่มพนักงาน
                </Button>
              </Space>
            </span>
          </section>

          {/* =================================================
              Employee Table
          ================================================= */}

          <Table
            rowKey="id"
            columns={columns}
            dataSource={filteredEmployees}
            loading={loading}
            scroll={{
              x: 1100,
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) =>
                `ทั้งหมด ${total} คน`,
            }}
          />
        </section>

        {/* ===================================================
            Create / Edit Modal
        =================================================== */}

        <Modal
          title={
            <span className="flex items-center gap-2">
              <UserOutlined className="text-amber-500" />

              <span>
                {editing
                  ? "แก้ไขข้อมูลพนักงาน"
                  : "เพิ่มพนักงาน"}
              </span>
            </span>
          }
          open={modalOpen}
          onCancel={closeModal}
          onOk={() =>
            form.submit()
          }
          okText={
            editing
              ? "บันทึกการแก้ไข"
              : "เพิ่มพนักงาน"
          }
          cancelText="ยกเลิก"
          confirmLoading={saving}
          destroyOnClose
          width={720}
          okButtonProps={{
            style: {
              background: "#F59E0B",
              borderColor: "#F59E0B",
            },
          }}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark={false}
            autoComplete="off"
          >

            {/* =================================================
                Personal Information
            ================================================= */}

            <span className="flex items-center gap-2 mt-2 mb-3">
              <UserOutlined className="text-amber-500" />

              <span className="font-semibold text-slate-700">
                ข้อมูลพนักงาน
              </span>
            </span>

            <Divider className="!mt-0" />

            <Row gutter={16}>

              {/* Employee Code */}

              <Col xs={24} md={12}>
                <Form.Item
                  name="employee_code"
                  label="รหัสพนักงาน"
                  rules={[
                    {
                      required: true,
                      message:
                        "กรุณากรอกรหัสพนักงาน",
                    },
                  ]}
                >
                  <Input
                    prefix={
                      <IdcardOutlined />
                    }
                    placeholder="เช่น EMP001"
                  />
                </Form.Item>
              </Col>

              {/* Phone */}

              <Col xs={24} md={12}>
                <Form.Item
                  name="phone"
                  label="เบอร์โทรศัพท์"
                  rules={[
                    {
                      pattern:
                        /^[0-9+\-\s()]+$/,
                      message:
                        "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง",
                    },
                  ]}
                >
                  <Input
                    prefix={
                      <PhoneOutlined />
                    }
                    placeholder="เช่น 0812345678"
                  />
                </Form.Item>
              </Col>

              {/* First Name */}

              <Col xs={24} md={12}>
                <Form.Item
                  name="first_name"
                  label="ชื่อ"
                  rules={[
                    {
                      required: true,
                      message:
                        "กรุณากรอกชื่อ",
                    },
                  ]}
                >
                  <Input
                    prefix={
                      <UserOutlined />
                    }
                    placeholder="ชื่อ"
                  />
                </Form.Item>
              </Col>

              {/* Last Name */}

              <Col xs={24} md={12}>
                <Form.Item
                  name="last_name"
                  label="นามสกุล"
                  rules={[
                    {
                      required: true,
                      message:
                        "กรุณากรอกนามสกุล",
                    },
                  ]}
                >
                  <Input
                    prefix={
                      <UserOutlined />
                    }
                    placeholder="นามสกุล"
                  />
                </Form.Item>
              </Col>

              {/* Department */}

              <Col xs={24} md={12}>
                <Form.Item
                  name="department"
                  label="แผนก"
                  rules={[
                    {
                      required: true,
                      message:
                        "กรุณากรอกแผนก",
                    },
                  ]}
                >
                  <Input
                    prefix={
                      <ApartmentOutlined />
                    }
                    placeholder="เช่น ฝ่ายบำรุงรักษาถนน"
                  />
                </Form.Item>
              </Col>

              {/* Position */}

              <Col xs={24} md={12}>
                <Form.Item
                  name="position"
                  label="ตำแหน่ง"
                  rules={[
                    {
                      required: true,
                      message:
                        "กรุณากรอกตำแหน่ง",
                    },
                  ]}
                >
                  <Input
                    prefix={
                      <SafetyOutlined />
                    }
                    placeholder="เช่น เจ้าหน้าที่"
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* =================================================
                Account Information
            ================================================= */}

            <span className="flex items-center gap-2 mt-4 mb-3">
              <LockOutlined className="text-amber-500" />

              <span className="font-semibold text-slate-700">
                ข้อมูลบัญชี
              </span>
            </span>

            <Divider className="!mt-0" />

            <Row gutter={16}>

              {/* Email */}

              <Col xs={24} md={12}>
                <Form.Item
                  name="email"
                  label="อีเมล"
                  rules={[
                    {
                      required: true,
                      type: "email",
                      message:
                        "กรุณากรอกอีเมลให้ถูกต้อง",
                    },
                  ]}
                >
                  <Input
                    prefix={
                      <MailOutlined />
                    }
                    placeholder="employee@roadmonitor.com"
                    disabled={Boolean(editing)}
                  />
                </Form.Item>
              </Col>

              {/* Role */}

              <Col xs={24} md={12}>
                <Form.Item
                  name="role"
                  label="บทบาท"
                  rules={[
                    {
                      required: true,
                      message:
                        "กรุณาเลือกบทบาท",
                    },
                  ]}
                >
                  <Select
                    options={[
                      {
                        value: "officer",
                        label:
                          "Officer - เจ้าหน้าที่",
                      },
                      {
                        value: "admin",
                        label:
                          "Admin - ผู้ดูแลระบบ",
                      },
                    ]}
                  />
                </Form.Item>
              </Col>

              {/* Password */}

              <Col xs={24} md={12}>
                <Form.Item
                  name="password"
                  label={
                    editing
                      ? "รหัสผ่านใหม่"
                      : "รหัสผ่าน"
                  }
                  extra={
                    editing
                      ? "เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน"
                      : "ต้องมีอย่างน้อย 8 ตัวอักษร"
                  }
                  rules={[
                    {
                      required: !editing,
                      message:
                        "กรุณากรอกรหัสผ่าน",
                    },
                    {
                      min: 8,
                      message:
                        "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
                    },
                  ]}
                >
                  <Input.Password
                    prefix={
                      <LockOutlined />
                    }
                    placeholder={
                      editing
                        ? "รหัสผ่านใหม่"
                        : "อย่างน้อย 8 ตัวอักษร"
                    }
                  />
                </Form.Item>
              </Col>

              {/* Confirm Password */}

              {!editing && (
                <Col xs={24} md={12}>
                  <Form.Item
                    name="confirm_password"
                    label="ยืนยันรหัสผ่าน"
                    dependencies={[
                      "password",
                    ]}
                    rules={[
                      {
                        required: true,
                        message:
                          "กรุณายืนยันรหัสผ่าน",
                      },

                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (
                            !value ||
                            getFieldValue(
                              "password"
                            ) === value
                          ) {
                            return Promise.resolve();
                          }

                          return Promise.reject(
                            new Error(
                              "รหัสผ่านไม่ตรงกัน"
                            )
                          );
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      prefix={
                        <LockOutlined />
                      }
                      placeholder="กรอกรหัสผ่านอีกครั้ง"
                    />
                  </Form.Item>
                </Col>
              )}

              {/* Active Status */}

              {editing && (
                <Col xs={24} md={12}>
                  <Form.Item
                    name="is_active"
                    label="สถานะบัญชี"
                    valuePropName="checked"
                  >
                    <Switch
                      checkedChildren="ใช้งาน"
                      unCheckedChildren="ปิดใช้งาน"
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>
          </Form>
        </Modal>
      </section>
    </>
  );
}