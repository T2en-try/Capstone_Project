import React, { useState } from "react";
import {
  Drawer,
  Button,
  Space,
  Typography,
  Slider,
  Row,
  Col,
  Card,
  Tag,
  Tooltip,
  Alert,
  InputNumber,
  Badge,
} from "antd";
import {
  SlidersOutlined,
  UndoOutlined,
  CheckCircleOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";

import { DSS_PRESETS, DEFAULT_DSS_WEIGHTS } from "./dssConfig";

const { Text } = Typography;



export default function DSSWeightSettingsDrawer({
  open,
  onClose,
  currentWeights = DEFAULT_DSS_WEIGHTS,
  onApplyWeights,
}) {
  const [localWeights, setLocalWeights] = useState(currentWeights);
  const [activePreset, setActivePreset] = useState("balanced");

  React.useEffect(() => {
    if (open) {
      setLocalWeights(currentWeights);
      const matched = DSS_PRESETS.find(p => JSON.stringify(p.weights) === JSON.stringify(currentWeights));
      setActivePreset(matched ? matched.id : "custom");
    }
  }, [open, currentWeights]);

  const handleSelectPreset = (preset) => {
    setActivePreset(preset.id);
    setLocalWeights(preset.weights);
  };

  const handlePpiChange = (val) => {
    if (val === null) return;
    setActivePreset("custom");
    const ppi = val / 100;
    const cus = Math.round((1 - ppi) * 100) / 100;
    setLocalWeights((prev) => ({ ...prev, w_ppi: ppi, w_cus: cus }));
  };

  const handleCusFactorChange = (factorKey, val) => {
    if (val === null) return;
    setActivePreset("custom");
    setLocalWeights((prev) => ({ ...prev, [factorKey]: val / 100 }));
  };

  const normalizeCusFactors = () => {
    const sum = (localWeights.w_c || 0) + (localWeights.w_d || 0) + (localWeights.w_r || 0) + (localWeights.w_n || 0);
    if (sum <= 0) return;
    setLocalWeights((prev) => ({
      ...prev,
      w_c: Math.round(((prev.w_c || 0) / sum) * 100) / 100,
      w_d: Math.round(((prev.w_d || 0) / sum) * 100) / 100,
      w_r: Math.round(((prev.w_r || 0) / sum) * 100) / 100,
      w_n: Math.round(((prev.w_n || 0) / sum) * 100) / 100,
    }));
  };

  const handleReset = () => {
    handleSelectPreset(DSS_PRESETS[0]);
  };

  const handleApply = () => {
    if (onApplyWeights) {
      onApplyWeights(localWeights);
    }
    onClose();
  };

  const cusSumPercent = Math.round(
    ((localWeights.w_c || 0) + (localWeights.w_d || 0) + (localWeights.w_r || 0) + (localWeights.w_n || 0)) * 100
  );

  const SectionTitle = ({ title, icon, extra, style }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, ...style }}>
      <Space size={8}>
        {icon && <span style={{ color: "#64748B" }}>{icon}</span>}
        <Text strong style={{ fontSize: 13, color: "#334155", letterSpacing: "0.5px", textTransform: "uppercase" }}>
          {title}
        </Text>
      </Space>
      {extra}
    </div>
  );

  const SliderRow = ({ label, tooltip, value, onChange, color = "#3B82F6" }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Space size={4}>
          <Text style={{ fontSize: 13, color: "#1E293B", fontWeight: 500 }}>{label}</Text>
          {tooltip && (
            <Tooltip title={tooltip}>
              <InfoCircleOutlined style={{ fontSize: 12, color: "#94A3B8", cursor: "help" }} />
            </Tooltip>
          )}
        </Space>
        <InputNumber
          min={0}
          max={100}
          value={value}
          onChange={onChange}
          size="small"
          formatter={(val) => `${val}%`}
          parser={(val) => val?.replace("%", "")}
          style={{ width: 64, borderRadius: 6 }}
        />
      </div>
      <Slider
        min={0}
        max={100}
        value={value}
        onChange={onChange}
        trackStyle={{ backgroundColor: color, height: 6 }}
        railStyle={{ backgroundColor: "#E2E8F0", height: 6 }}
        handleStyle={{ height: 16, width: 16, marginTop: -5, borderColor: color }}
        style={{ margin: "10px 0 0 0" }}
      />
    </div>
  );

  return (
    <Drawer
      title={
        <Space size={12}>
          <div style={{ 
            width: 36, height: 36, borderRadius: 10, 
            background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)"
          }}>
            <ExperimentOutlined style={{ color: "#FFF", fontSize: 18 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Text strong style={{ fontSize: 16, lineHeight: 1.2, color: "#0F172A" }}>Decision Support System</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>ระบบจำลองนโยบายน้ำหนักความสำคัญ</Text>
          </div>
        </Space>
      }
      placement="right"
      width={480}
      onClose={onClose}
      open={open}
      styles={{
        header: { padding: "16px 24px", borderBottom: "1px solid #F1F5F9" },
        body: { padding: "24px", backgroundColor: "#FAFAFA" },
        footer: { padding: "16px 24px", borderTop: "1px solid #E2E8F0", backgroundColor: "#FFF" }
      }}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Button icon={<UndoOutlined />} onClick={handleReset} style={{ color: "#64748B", borderColor: "#CBD5E1", borderRadius: 8 }}>
            รีเซ็ตค่าเริ่มต้น
          </Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleApply}
            style={{ background: "#2563EB", boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)", padding: "0 24px", borderRadius: 8 }}
          >
            ประมวลผลแผนที่ใหม่
          </Button>
        </div>
      }
    >
      <SectionTitle 
        title="Policy Presets" 
        icon={<BulbOutlined />} 
        extra={activePreset === "custom" && <Badge color="orange" text="Customized" />}
        style={{ marginTop: 0 }}
      />
      <Row gutter={[12, 12]}>
        {DSS_PRESETS.map((p) => {
          const isSelected = activePreset === p.id;
          return (
            <Col span={12} key={p.id}>
              <div
                onClick={() => handleSelectPreset(p)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  cursor: "pointer",
                  backgroundColor: isSelected ? p.bg : "#FFF",
                  border: `1.5px solid ${isSelected ? p.color : "#E2E8F0"}`,
                  boxShadow: isSelected ? `0 2px 8px ${p.color}20` : "0 1px 2px rgba(0,0,0,0.02)",
                  transition: "all 0.2s ease-in-out",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ 
                    width: 28, height: 28, borderRadius: "50%", 
                    backgroundColor: isSelected ? p.color : "#F1F5F9",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: isSelected ? "#FFF" : "#64748B",
                    fontSize: 14, transition: "all 0.2s"
                  }}>
                    {p.icon}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <Text strong style={{ fontSize: 13, color: isSelected ? p.color : "#334155", lineHeight: 1.2 }}>
                      {p.name}
                    </Text>
                    <Text style={{ fontSize: 10, color: isSelected ? p.color : "#94A3B8", opacity: 0.9 }}>{p.subName}</Text>
                  </div>
                </div>
                <Text style={{ fontSize: 12, color: isSelected ? "#475569" : "#64748B", lineHeight: 1.4 }}>
                  {p.description}
                </Text>
              </div>
            </Col>
          );
        })}
      </Row>

      <Card
        style={{
          marginTop: 24,
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          borderColor: "#E2E8F0",
        }}
        styles={{ body: { padding: "16px 20px" } }}
      >
        <SectionTitle title="Overall Balance" icon={<SlidersOutlined />} style={{ marginTop: 0 }} />
        
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <Text strong style={{ fontSize: 13, color: "#1E293B" }}>
            🤖 AI Physical Damage <Text type="secondary">({Math.round((localWeights.w_ppi || 0) * 100)}%)</Text>
          </Text>
          <Text strong style={{ fontSize: 13, color: "#7C3AED" }}>
            ({Math.round((localWeights.w_cus || 0) * 100)}%) <Text type="secondary">Community</Text> 👥
          </Text>
        </div>

        <Slider
          min={10}
          max={90}
          step={5}
          value={Math.round((localWeights.w_ppi || 0) * 100)}
          onChange={handlePpiChange}
          tooltip={{ formatter: (val) => `AI Damage: ${val}% | Community: ${100 - val}%` }}
          trackStyle={{ backgroundColor: "#2563EB", height: 6 }}
          railStyle={{ backgroundColor: "#E2E8F0", height: 6 }}
          handleStyle={{ height: 16, width: 16, marginTop: -5, borderColor: "#2563EB" }}
        />
        
        <div style={{ backgroundColor: "#F8FAFC", padding: "10px 14px", borderRadius: 8, marginTop: 16, border: "1px dashed #CBD5E1" }}>
          <Text style={{ fontSize: 12, color: "#475569", fontFamily: "monospace", display: "flex", justifyContent: "center" }}>
            Score = <span style={{color: "#2563EB", margin: "0 4px"}}>{((localWeights.w_ppi || 0) * 100).toFixed(0)}% × PPI</span> + <span style={{color: "#7C3AED", margin: "0 4px"}}>{((localWeights.w_cus || 0) * 100).toFixed(0)}% × CUS</span>
          </Text>
        </div>
      </Card>

      <Card
        style={{
          marginTop: 20,
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          borderColor: "#E2E8F0",
        }}
        styles={{ body: { padding: "16px 20px" } }}
      >
        <SectionTitle 
          title="Community Factors (CUS)" 
          icon={<SettingOutlined />} 
          extra={
            <Tag color={cusSumPercent === 100 ? "success" : "error"} bordered={false} style={{ borderRadius: 12, margin: 0 }}>
              Total: {cusSumPercent}%
            </Tag>
          }
          style={{ marginTop: 0 }}
        />

        <SliderRow
          label="C — ปริมาณการแจ้งเหตุสะสม"
          value={Math.round((localWeights.w_c || 0) * 100)}
          onChange={(val) => handleCusFactorChange("w_c", val)}
          color="#3B82F6"
        />
        <SliderRow
          label="D — ความหนาแน่นต่อถนนจริง"
          value={Math.round((localWeights.w_d || 0) * 100)}
          onChange={(val) => handleCusFactorChange("w_d", val)}
          color="#10B981"
        />
        <SliderRow
          label="R — ความสดใหม่ของเหตุการณ์"
          value={Math.round((localWeights.w_r || 0) * 100)}
          onChange={(val) => handleCusFactorChange("w_r", val)}
          color="#F59E0B"
        />
        <SliderRow
          label="N — ความหนาแน่นโครงข่ายถนน"
          tooltip="นับจำนวนเส้นถนนที่ตัดผ่านในรัศมี 100m จากจุดกึ่งกลางกริด (Nearby Road Segment Density)"
          value={Math.round((localWeights.w_n || 0) * 100)}
          onChange={(val) => handleCusFactorChange("w_n", val)}
          color="#8B5CF6"
        />

        {cusSumPercent !== 100 && (
          <Alert
            type="error"
            showIcon
            message={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12 }}>ผลรวมสัดส่วน CUS ต้องเท่ากับ 100%</span>
                <Button size="small" type="primary" danger onClick={normalizeCusFactors} style={{ borderRadius: 6, fontSize: 11 }}>
                  Auto-Balance
                </Button>
              </div>
            }
            style={{ marginTop: 12, borderRadius: 8, border: "none" }}
          />
        )}
      </Card>

      <div style={{ marginTop: 24, textAlign: "center", padding: "0 12px" }}>
        <Text type="secondary" style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.5, display: "block" }}>
          * <b>CUS Redesign Notes:</b> ปัจจัย P (Population) ถูกนำออกเพื่อลดปัญหา Double-counting และ H (Hospital) รอการขยายรัศมีข้อมูลเพิ่มเติม
        </Text>
      </div>
    </Drawer>
  );
}
