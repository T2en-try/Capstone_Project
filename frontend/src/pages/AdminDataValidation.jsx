import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Space, Spin, Typography } from "antd";
import {
    ReloadOutlined,
    RobotOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
} from "@ant-design/icons";

import SummaryCards from "../components/admin-datavalidation/SummaryCards";
import VerificationFilter from "../components/admin-datavalidation/VerificationFilter";
import VerificationTable from "../components/admin-datavalidation/VerificationTable";

import { fetchReports } from "../services/dashboardService";
import {
    getConfidencePercent,
    getPriorityLabel,
    normalizePriorityClass,
} from "../utils/priorityMapping";

const { Title, Text } = Typography;

/* =========================================================
   UI Colors
========================================================= */

const COLORS = {
    background: "#F5F6F8",
    white: "#FFFFFF",

    text: "#1F2937",
    secondary: "#64748B",
    muted: "#94A3B8",

    border: "#E5E7EB",

    primary: "#2563EB",
    primarySoft: "#EFF6FF",

    success: "#16A34A",
    successSoft: "#F0FDF4",

    warning: "#F59E0B",
    warningSoft: "#FFFBEB",

    danger: "#DC2626",
    dangerSoft: "#FEF2F2",

    info: "#0284C7",
};

/* =========================================================
   Convert API Report → Verification Report
========================================================= */

const toVerificationReport = (report) => {
    const analysis = report.ai_analysis;

    const statusMap = {
        pending: "WAITING",
        processing: "WAITING",
        completed: "VERIFIED",
        rejected: "REJECTED",
    };

    return {
        id: report.id,
        reportId: report.id,

        roadName:
            analysis?.road_name ||
            report.road_name ||
            "ไม่ระบุชื่อถนน",

        district:
            analysis?.admin_district ||
            "ไม่ระบุพื้นที่",

        createdAt: report.created_at
            ? new Date(report.created_at).toLocaleString("th-TH")
            : "-",

        priorityClass: normalizePriorityClass(
            analysis?.priority_class
        ),

        aiDecision: getPriorityLabel(
            analysis?.priority_class
        ),

        confidence: getConfidencePercent(
            analysis?.confidence_score
        ),

        probaNormal: analysis?.proba_normal,
        probaWarning: analysis?.proba_warning,
        probaCritical: analysis?.proba_critical,

        verificationStatus:
            statusMap[report.status] || "WAITING",

        image:
            report.image_url ||
            `/uploads/${report.image_filename}`,

        annotatedImage:
            analysis?.annotated_image_filename
                ? `/uploads/${analysis.annotated_image_filename}`
                : null,

        rainfall:
            analysis?.rainfall_last_12m_mm,

        ndvi:
            analysis?.ndvi_index,

        slope:
            analysis?.slope,
    };
};

/* =========================================================
   Page
========================================================= */

export default function AIVerificationPage() {
    const [filters, setFilters] = useState({
        keyword: "",
        decision: undefined,
        status: undefined,
        confidence: [0, 100],
        dateRange: null,
    });

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /* =======================================================
       Load Reports
    ======================================================= */

    const loadReports = async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await fetchReports(1, 100);

            if (!result.success) {
                throw new Error(
                    result.error ||
                        "ไม่สามารถโหลดข้อมูลได้"
                );
            }

            setReports(
                (result.data?.reports || []).map(
                    toVerificationReport
                )
            );
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    /* =======================================================
       Filtering
    ======================================================= */

    const filteredReports = useMemo(() => {
        return reports.filter((report) => {
            const keyword =
                filters.keyword
                    ?.trim()
                    .toLowerCase() || "";

            const matchesKeyword =
                !keyword ||
                [
                    report.reportId,
                    report.roadName,
                ].some((value) =>
                    String(value || "")
                        .toLowerCase()
                        .includes(keyword)
                );

            const matchesDecision =
                !filters.decision ||
                report.aiDecision ===
                    filters.decision;

            const matchesStatus =
                !filters.status ||
                report.verificationStatus ===
                    filters.status;

            const confidence =
                Number(report.confidence);

            const matchesConfidence =
                Number.isNaN(confidence) ||
                (confidence >=
                    filters.confidence[0] &&
                    confidence <=
                        filters.confidence[1]);

            return (
                matchesKeyword &&
                matchesDecision &&
                matchesStatus &&
                matchesConfidence
            );
        });
    }, [filters, reports]);

    /* =======================================================
       Summary
    ======================================================= */

    const verificationSummary = useMemo(() => {
        const total = reports.length;

        const verified = reports.filter(
            (report) =>
                report.verificationStatus ===
                "VERIFIED"
        ).length;

        const waiting = reports.filter(
            (report) =>
                report.verificationStatus ===
                "WAITING"
        ).length;

        const rejected = reports.filter(
            (report) =>
                report.verificationStatus ===
                "REJECTED"
        ).length;

        return {
            total,
            verified,
            waiting,
            rejected,
        };
    }, [reports]);

    /* =======================================================
       Render
    ======================================================= */

    return (
        <main
            style={{
                minHeight: "100vh",
                background: COLORS.background,
                padding: "24px 28px 40px",
                color: COLORS.text,
                fontFamily:
                    "Sarabun, Arial, sans-serif",
            }}
        >
            {/* =================================================
                Header
            ================================================= */}

            <header
                style={{
                    display: "flex",
                    justifyContent:
                        "space-between",
                    alignItems: "center",
                    gap: 20,
                    marginBottom: 22,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 13,
                    }}
                >
                    <div
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            background:
                                COLORS.primarySoft,
                            color:
                                COLORS.primary,
                            display: "flex",
                            alignItems: "center",
                            justifyContent:
                                "center",
                            fontSize: 19,
                        }}
                    >
                        <RobotOutlined />
                    </div>

                    <div>
                        <Title
                            level={2}
                            style={{
                                margin: 0,
                                fontSize: 25,
                                lineHeight: 1.2,
                                fontWeight: 600,
                                color: COLORS.text,
                                fontFamily:
                                    "Kanit, sans-serif",
                            }}
                        >
                            AI Verification
                        </Title>

                        <Text
                            style={{
                                color:
                                    COLORS.secondary,
                                fontSize: 13,
                            }}
                        >
                            ตรวจสอบผลการวิเคราะห์
                            และการจัดลำดับความสำคัญของ AI
                        </Text>
                    </div>
                </div>

                <Button
                    icon={<ReloadOutlined />}
                    onClick={loadReports}
                    loading={loading}
                    style={{
                        height: 36,
                        padding:
                            "0 14px",
                        borderRadius: 7,
                        borderColor:
                            COLORS.border,
                        background:
                            COLORS.white,
                        color:
                            COLORS.text,
                    }}
                >
                    รีเฟรช
                </Button>
            </header>

            {/* =================================================
                Error
            ================================================= */}

            {error && (
                <Alert
                    type="error"
                    showIcon
                    message="ไม่สามารถโหลดข้อมูล AI Validation ได้"
                    description={error}
                    closable
                    onClose={() =>
                        setError(null)
                    }
                    style={{
                        marginBottom: 18,
                        borderRadius: 7,
                    }}
                />
            )}

            {/* =================================================
                Loading
            ================================================= */}

            {loading ? (
                <div
                    style={{
                        minHeight: 300,
                        display: "flex",
                        alignItems:
                            "center",
                        justifyContent:
                            "center",
                    }}
                >
                    <Spin
                        size="large"
                        tip="กำลังโหลดข้อมูล..."
                    />
                </div>
            ) : (
                <>
                    {/* =================================================
                        Summary Strip
                    ================================================= */}

                    <section
                        style={{
                            background:
                                COLORS.white,
                            border:
                                `1px solid ${COLORS.border}`,
                            borderRadius: 8,
                            marginBottom: 20,
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(4, 1fr)",
                            overflow: "hidden",
                        }}
                    >
                        {/* Total */}

                        <div
                            style={{
                                padding:
                                    "15px 18px",
                                borderRight:
                                    `1px solid ${COLORS.border}`,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 12,
                                    color:
                                        COLORS.secondary,
                                }}
                            >
                                รายงานทั้งหมด
                            </Text>

                            <div
                                style={{
                                    fontSize: 24,
                                    fontWeight: 700,
                                    color:
                                        COLORS.text,
                                    marginTop: 2,
                                }}
                            >
                                {
                                    verificationSummary.total
                                }
                            </div>
                        </div>

                        {/* Verified */}

                        <div
                            style={{
                                padding:
                                    "15px 18px",
                                borderRight:
                                    `1px solid ${COLORS.border}`,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 12,
                                    color:
                                        COLORS.secondary,
                                }}
                            >
                                ยืนยันแล้ว
                            </Text>

                            <div
                                style={{
                                    display:
                                        "flex",
                                    alignItems:
                                        "center",
                                    gap: 7,
                                    marginTop: 2,
                                }}
                            >
                                <CheckCircleOutlined
                                    style={{
                                        color:
                                            COLORS.success,
                                    }}
                                />

                                <span
                                    style={{
                                        fontSize: 24,
                                        fontWeight: 700,
                                        color:
                                            COLORS.success,
                                    }}
                                >
                                    {
                                        verificationSummary.verified
                                    }
                                </span>
                            </div>
                        </div>

                        {/* Waiting */}

                        <div
                            style={{
                                padding:
                                    "15px 18px",
                                borderRight:
                                    `1px solid ${COLORS.border}`,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 12,
                                    color:
                                        COLORS.secondary,
                                }}
                            >
                                รอตรวจสอบ
                            </Text>

                            <div
                                style={{
                                    display:
                                        "flex",
                                    alignItems:
                                        "center",
                                    gap: 7,
                                    marginTop: 2,
                                }}
                            >
                                <ClockCircleOutlined
                                    style={{
                                        color:
                                            COLORS.warning,
                                    }}
                                />

                                <span
                                    style={{
                                        fontSize: 24,
                                        fontWeight: 700,
                                        color:
                                            COLORS.warning,
                                    }}
                                >
                                    {
                                        verificationSummary.waiting
                                    }
                                </span>
                            </div>
                        </div>

                        {/* Rejected */}

                        <div
                            style={{
                                padding:
                                    "15px 18px",
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 12,
                                    color:
                                        COLORS.secondary,
                                }}
                            >
                                ปฏิเสธ
                            </Text>

                            <div
                                style={{
                                    display:
                                        "flex",
                                    alignItems:
                                        "center",
                                    gap: 7,
                                    marginTop: 2,
                                }}
                            >
                                <CloseCircleOutlined
                                    style={{
                                        color:
                                            COLORS.danger,
                                    }}
                                />

                                <span
                                    style={{
                                        fontSize: 24,
                                        fontWeight: 700,
                                        color:
                                            COLORS.danger,
                                    }}
                                >
                                    {
                                        verificationSummary.rejected
                                    }
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* =================================================
                        Existing SummaryCards
                    ================================================= */}

                    {/* <section
                        style={{
                            marginBottom: 20,
                        }}
                    >
                        <SummaryCards
                            reports={reports}
                        />
                    </section> */}

                    {/* =================================================
                        Filter
                    ================================================= */}

                    <section
                        style={{
                            background:
                                COLORS.white,
                            borderTop:
                                `1px solid ${COLORS.border}`,
                            borderBottom:
                                `1px solid ${COLORS.border}`,
                            padding:
                                "15px 0",
                            marginBottom: 20,
                        }}
                    >
                       

                        <VerificationFilter
                            filters={filters}
                            setFilters={setFilters}
                        />
                    </section>

                    {/* =================================================
                        Table Header
                    ================================================= */}

                    <section>
                        <div
                            style={{
                                display:
                                    "flex",
                                alignItems:
                                    "flex-end",
                                justifyContent:
                                    "space-between",
                                marginBottom: 10,
                                gap: 15,
                            }}
                        >
                            <div>
                                <h3
                                    style={{
                                        margin: 0,
                                        fontSize: 20,
                                        fontWeight: 600,
                                        color:
                                            COLORS.text,
                                        fontFamily:
                                            "Kanit, sans-serif",
                                    }}
                                >
                                    รายการตรวจสอบ AI
                                </h3>

                                <Text
                                    style={{
                                        fontSize: 12,
                                        color:
                                            COLORS.secondary,
                                    }}
                                >
                                    แสดง{" "}
                                    {
                                        filteredReports.length
                                    }{" "}
                                    จาก{" "}
                                    {
                                        reports.length
                                    }{" "}
                                    รายการ
                                </Text>
                            </div>

                            <Text
                                style={{
                                    fontSize: 12,
                                    color:
                                        COLORS.muted,
                                }}
                            >
                                Priority Class
                                เป็นผลการตัดสินหลักของ AI
                            </Text>
                        </div>

                        <VerificationTable
                            reports={
                                filteredReports
                            }
                        />
                    </section>
                </>
            )}
        </main>
    );
}