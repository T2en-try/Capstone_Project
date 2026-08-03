import { useEffect, useState } from "react";
import {
  Drawer,
  Row,
  Col,
  Card,
  Image,
  Descriptions,
  Tag,
  Statistic,
  Radio,
  Select,
  Input,
  Divider,
  Button,
  Space,
  Progress,
  message,
} from "antd";

const { TextArea } = Input;

export default function VerificationDetailDrawer({
  open,
  report,
  onClose,
  onConfirm,
}) {
  const [decision, setDecision] = useState("correct");
  const [severity, setSeverity] = useState();
  const [damageType, setDamageType] = useState();
  const [priority, setPriority] = useState();
  const [remark, setRemark] = useState("");

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDecision("correct");
      setSeverity(undefined);
      setDamageType(undefined);
      setPriority(undefined);
      setRemark("");
    }
  }, [open]);

  if (!report) return null;

  const handleConfirm = () => {
    if (decision === "incorrect") {
      if (!severity || !damageType) {
        message.warning("Please complete the verification form.");
        return;
      }
    }

    onConfirm({
      reportId: report.id,
      decision,
      severity,
      damageType,
      priority,
      remark,
    });
  };

  return (
    <Drawer
      title={`AI Verification : ${report.reportId}`}
      width={900}
      open={open}
      onClose={onClose}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Card title="Original Image">
            <Image
              width="100%"
              src={
                report.image ||
                "https://placehold.co/600x400?text=Original+Image"
              }
            />
          </Card>
        </Col>

        <Col span={12}>
          <Card title="AI Annotated Image">
            <Image
              width="100%"
              src={
                report.annotatedImage ||
                "https://placehold.co/600x400?text=AI+Annotated"
              }
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={16}>
        <Col span={12}>
          <Card title="Report Information">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Report ID">
                {report.reportId}
              </Descriptions.Item>

              <Descriptions.Item label="Road">
                {report.roadName}
              </Descriptions.Item>

              <Descriptions.Item label="District">
                {report.district}
              </Descriptions.Item>

              <Descriptions.Item label="Created">
                {report.createdAt}
              </Descriptions.Item>

              <Descriptions.Item label="AI Decision">
                <Tag color="red">{report.aiDecision}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="AI Analysis">
            <Statistic
              title="Confidence"
              value={report.confidence}
              suffix="%"
            />

            <Progress
              percent={report.confidence}
              status="active"
            />

            <br />

            <Statistic
              title="Fusion Score"
              value={report.fusionScore}
            />

            <br />

            <Tag color="blue">
              {report.verificationStatus}
            </Tag>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Card title="Environmental Context">
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="Rainfall"
              value={1230}
              suffix="mm"
            />
          </Col>

          <Col span={8}>
            <Statistic
              title="NDVI"
              value={0.42}
            />
          </Col>

          <Col span={8}>
            <Statistic
              title="Slope"
              value={3}
              suffix="°"
            />
          </Col>
        </Row>
      </Card>

      <Divider />

      <Card title="Engineer Verification">
        <Radio.Group
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
        >
          <Space direction="vertical">
            <Radio value="correct">
              AI Prediction Correct
            </Radio>

            <Radio value="incorrect">
              AI Prediction Incorrect
            </Radio>
          </Space>
        </Radio.Group>

        {decision === "incorrect" && (
          <>
            <Divider />

            <Row gutter={16}>
              <Col span={12}>
                <Select
                  placeholder="Correct Severity"
                  style={{ width: "100%" }}
                  value={severity}
                  onChange={setSeverity}
                  options={[
                    {
                      label: "Low",
                      value: "Low",
                    },
                    {
                      label: "Moderate",
                      value: "Moderate",
                    },
                    {
                      label: "Warning",
                      value: "Warning",
                    },
                    {
                      label: "Critical",
                      value: "Critical",
                    },
                  ]}
                />
              </Col>

              <Col span={12}>
                <Select
                  placeholder="Damage Type"
                  style={{ width: "100%" }}
                  value={damageType}
                  onChange={setDamageType}
                  options={[
                    {
                      label: "Pothole",
                      value: "Pothole",
                    },
                    {
                      label: "Crack",
                      value: "Crack",
                    },
                    {
                      label: "Rutting",
                      value: "Rutting",
                    },
                    {
                      label: "Depression",
                      value: "Depression",
                    },
                  ]}
                />
              </Col>
            </Row>

            <br />

            <Select
              placeholder="Priority"
              style={{ width: "100%" }}
              value={priority}
              onChange={setPriority}
              options={[
                {
                  label: "Low",
                  value: "LOW",
                },
                {
                  label: "Medium",
                  value: "MEDIUM",
                },
                {
                  label: "High",
                  value: "HIGH",
                },
                {
                  label: "Critical",
                  value: "CRITICAL",
                },
              ]}
            />

            <br />
            <br />

            <TextArea
              rows={4}
              placeholder="Engineer Remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </>
        )}

        <Divider />

        <Space
          style={{
            width: "100%",
            justifyContent: "flex-end",
          }}
        >
          <Button onClick={onClose}>
            Cancel
          </Button>

          <Button
            type="primary"
            onClick={handleConfirm}
          >
            Confirm Verification
          </Button>
        </Space>
      </Card>
    </Drawer>
  );
}