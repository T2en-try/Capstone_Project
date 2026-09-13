import { useCallback, useEffect, useState } from "react";

import {
    Alert,
    Card,
    Col,
    Row,
    Space,
    Spin,
    Typography,
} from "antd";

import { WarningOutlined } from "@ant-design/icons";

import SummaryCards from "../components/admin-priority/SummaryCards";
import FilterBar from "../components/admin-priority/FilterBar";
import ReportsTable from "../components/admin-priority/ReportsTable";

import {
    fetchDashboardStats,
    fetchReports,
} from "../services/dashboardService";

import {
    normalizePriorityClass,
} from "../utils/priorityMapping";

const { Title, Text } = Typography;

/* =========================================================
   COLORS
========================================================= */

const COLORS = {
    page: "#F5F6F8",
    white: "#FFFFFF",

    text: "#1F2937",
    secondary: "#64748B",

    border: "#E5E7EB",

    critical: "#DC2626",
    criticalSoft: "#FEF2F2",
};

/* =========================================================
   Priority Reports Page
========================================================= */

const PriorityReportsPage = () => {
    const [reports, setReports] = useState([]);
    const [stats, setStats] = useState(null);

    const [filters, setFilters] = useState({
        keyword: "",
        status: "all",
        priority: "all",
        province: "all",
        dateRange: null,
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /* =========================================================
       LOAD DATA
    ========================================================= */

    const loadReports = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [
                statsResult,
                reportsResult,
            ] = await Promise.all([
                fetchDashboardStats(),
                fetchReports(1, 100),
            ]);

            if (!statsResult.success) {
                throw new Error(
                    statsResult.error ||
                        "ไม่สามารถโหลดสถิติได้"
                );
            }

            if (!reportsResult.success) {
                throw new Error(
                    reportsResult.error ||
                        "ไม่สามารถโหลดรายงานได้"
                );
            }

            setStats(statsResult.data);

            /*
             * สำคัญ
             *
             * ไม่ filter report.status ตรงนี้
             *
             * เพราะ Status ที่แสดงในหน้านี้
             * ใช้ ReportAction
             */
            setReports(
                reportsResult.data?.reports || []
            );
        } catch (err) {
            console.error(
                "PriorityReportsPage load error:",
                err
            );

            setError(
                err?.message ||
                    "ไม่สามารถโหลดข้อมูลได้"
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    /* =========================================================
       GET GIS CONTEXT
       
       Database:
       ai_gis_context
       ├── road_name
       ├── admin_province
       ├── admin_district
       └── admin_subdistrict
       
       รองรับทั้ง:
       
       ai_analysis.admin_province
       ai_analysis.gis_context.admin_province
       ai_analysis.ai_gis_context.admin_province
       report.admin_province
    ========================================================= */

    const getGISContext = useCallback((report) => {
        const analysis =
            report?.ai_analysis || {};

        const gis =
            analysis?.ai_gis_context ||
            analysis?.gis_context ||
            report?.ai_gis_context ||
            report?.gis_context ||
            {};

        return {
            roadName:
                analysis?.road_name ||
                gis?.road_name ||
                report?.road_name ||
                "",

            province:
                analysis?.admin_province ||
                gis?.admin_province ||
                report?.admin_province ||
                "",

            district:
                analysis?.admin_district ||
                gis?.admin_district ||
                report?.admin_district ||
                "",

            subdistrict:
                analysis?.admin_subdistrict ||
                gis?.admin_subdistrict ||
                report?.admin_subdistrict ||
                "",
        };
    }, []);

    /* =========================================================
       GET STATUS FROM REPORT ACTION
       
       รองรับ:
       report.report_actions
       report.actions
       report.reportActions
       
       และรองรับ field:
       new_status
       status
       
       จะเลือก Action ล่าสุด
    ========================================================= */

    const getActionStatus = useCallback((report) => {
        const actions =
            report?.report_actions ||
            report?.actions ||
            report?.reportActions ||
            [];

        if (
            !Array.isArray(actions) ||
            actions.length === 0
        ) {
            return null;
        }

        const sortedActions = [...actions].sort(
            (a, b) => {
                const dateA = new Date(
                    a?.action_timestamp ||
                        a?.created_at ||
                        a?.timestamp ||
                        0
                ).getTime();

                const dateB = new Date(
                    b?.action_timestamp ||
                        b?.created_at ||
                        b?.timestamp ||
                        0
                ).getTime();

                return dateB - dateA;
            }
        );

        const latestAction =
            sortedActions[0];

        return (
            latestAction?.new_status ||
            latestAction?.status ||
            null
        );
    }, []);

    /* =========================================================
       NORMALIZE STATUS
       
       ป้องกันกรณี Backend ส่ง:
       PENDING
       pending
       Processing
       COMPLETED
    ========================================================= */

    const normalizeStatus = (value) => {
        if (!value) return "";

        return String(value)
            .trim()
            .toLowerCase();
    };

    /* =========================================================
       NORMALIZE PROVINCE
       
       รองรับ:
       จังหวัดนครราชสีมา
       นครราชสีมา
    ========================================================= */

    const normalizeProvince = (value) => {
        return String(value || "")
            .trim()
            .toLowerCase()
            .replace(/^จังหวัด/, "");
    };

    /* =========================================================
       FILTER REPORTS
    ========================================================= */

    const filteredReports = reports.filter(
        (report) => {
            const gis =
                getGISContext(report);

            /* =================================================
               SEARCH
            ================================================= */

            const keyword =
                String(
                    filters.keyword || ""
                )
                    .trim()
                    .toLowerCase();

            const matchesKeyword =
                !keyword ||
                [
                    report?.id,
                    report?.report_id,
                    report?.description,
                    report?.reporter_name,

                    gis?.roadName,
                    gis?.province,
                    gis?.district,
                    gis?.subdistrict,
                ].some((value) =>
                    String(value ?? "")
                        .toLowerCase()
                        .includes(keyword)
                );

            /* =================================================
               STATUS
               
               ใช้ ReportAction
            ================================================= */

            const actionStatus =
                normalizeStatus(
                    getActionStatus(report)
                );

            const selectedStatus =
                normalizeStatus(
                    filters.status
                );

            const matchesStatus =
                selectedStatus === "" ||
                selectedStatus === "all" ||
                actionStatus ===
                    selectedStatus;

            /* =================================================
               PRIORITY
               
               ai_analysis.priority_class
               
               1 = Good
               2 = Warning
               3 = Critical
            ================================================= */

            const reportPriorityClass =
                normalizePriorityClass(
                    report?.ai_analysis
                        ?.priority_class
                );

            const selectedPriority =
                filters.priority ||
                "all";

            const priorityMap = {
                Good: 1,
                Warning: 2,
                Critical: 3,
            };

            const selectedPriorityClass =
                priorityMap[
                    selectedPriority
                ];

            const matchesPriority =
                selectedPriority === "all" ||
                reportPriorityClass ===
                    selectedPriorityClass;

            /* =================================================
               PROVINCE
               
               ai_gis_context.admin_province
               
               Database:
               จังหวัดนครราชสีมา
            ================================================= */

            const reportProvince =
                normalizeProvince(
                    gis?.province
                );

            const selectedProvince =
                normalizeProvince(
                    filters.province
                );

            const matchesProvince =
                filters.province === "all" ||
                !filters.province ||
                reportProvince ===
                    selectedProvince;

            /* =================================================
               DATE
            ================================================= */

            let matchesDate = true;

            if (
                Array.isArray(
                    filters.dateRange
                ) &&
                filters.dateRange.length === 2 &&
                filters.dateRange[0] &&
                filters.dateRange[1]
            ) {
                const reportDate =
                    report?.created_at
                        ? new Date(
                              report.created_at
                          )
                        : null;

                if (
                    !reportDate ||
                    Number.isNaN(
                        reportDate.getTime()
                    )
                ) {
                    matchesDate = false;
                } else {
                    const startDate =
                        filters.dateRange[0]
                            .startOf("day")
                            .toDate();

                    const endDate =
                        filters.dateRange[1]
                            .endOf("day")
                            .toDate();

                    matchesDate =
                        reportDate >=
                            startDate &&
                        reportDate <=
                            endDate;
                }
            }

            /* =================================================
               FINAL FILTER
            ================================================= */

            return (
                matchesKeyword &&
                matchesStatus &&
                matchesPriority &&
                matchesProvince &&
                matchesDate
            );
        }
    );

    /* =========================================================
       RENDER
    ========================================================= */

    return (
        <div
            style={{
                minHeight: "100vh",
                background: COLORS.page,
                padding:
                    "20px 24px 32px",
            }}
        >
            {/* =====================================================
                PAGE HEADER
            ===================================================== */}

            <div
                style={{
                    marginBottom: 16,
                }}
            >
                <Row
                    justify="space-between"
                    align="middle"
                >
                    <Col>
                        <Space
                            align="start"
                            size={12}
                        >
                            <div
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 8,
                                    background:
                                        COLORS.criticalSoft,
                                    display: "flex",
                                    alignItems:
                                        "center",
                                    justifyContent:
                                        "center",
                                    flexShrink: 0,
                                }}
                            >
                                <WarningOutlined
                                    style={{
                                        fontSize: 20,
                                        color:
                                            COLORS.critical,
                                    }}
                                />
                            </div>

                            <div>
                                <Title
                                    level={2}
                                    style={{
                                        margin: 0,
                                        fontSize: 24,
                                        lineHeight:
                                            1.2,
                                        color:
                                            COLORS.text,
                                        fontWeight:
                                            650,
                                    }}
                                >
                                    Priority Reports
                                </Title>

                                <Text
                                    style={{
                                        color:
                                            COLORS.secondary,
                                        fontSize: 13,
                                    }}
                                >
                                    จัดการและติดตามรายงานถนน
                                    ตามระดับความสำคัญจาก AI
                                </Text>
                            </div>
                        </Space>
                    </Col>
                </Row>
            </div>

            {/* =====================================================
                ERROR
            ===================================================== */}

            {error && (
                <Alert
                    type="error"
                    showIcon
                    message="ไม่สามารถโหลดข้อมูล Priority Reports ได้"
                    description={error}
                    style={{
                        marginBottom: 16,
                        borderRadius: 8,
                    }}
                />
            )}

            {/* =====================================================
                LOADING
            ===================================================== */}

            {loading && !stats ? (
                <div
                    style={{
                        minHeight: 420,
                        display: "flex",
                        alignItems:
                            "center",
                        justifyContent:
                            "center",
                        background:
                            COLORS.white,
                        border:
                            `1px solid ${COLORS.border}`,
                        borderRadius: 10,
                    }}
                >
                    <Spin
                        size="large"
                        tip="กำลังโหลดข้อมูลจากฐานข้อมูล..."
                    />
                </div>
            ) : (
                <div>
                    {/* =================================================
                        SUMMARY
                    ================================================= */}

                    <div
                        style={{
                            marginBottom: 16,
                        }}
                    >
                        <SummaryCards
                            stats={stats}
                            reports={reports}
                            loading={loading}
                        />
                    </div>

                    {/* =================================================
                        REPORTS
                    ================================================= */}

                    <Card
                        bordered
                        style={{
                            borderRadius: 10,
                            borderColor:
                                COLORS.border,
                            boxShadow:
                                "0 1px 2px rgba(15, 23, 42, 0.04)",
                        }}
                        bodyStyle={{
                            padding: 0,
                        }}
                    >
                        {/* =================================================
                            SECTION HEADER
                        ================================================= */}

                        <div
                            style={{
                                padding:
                                    "18px 20px",
                                borderBottom:
                                    `1px solid ${COLORS.border}`,
                            }}
                        >
                            <Row
                                justify="space-between"
                                align="middle"
                            >
                                <Col>
                                    <Title
                                        level={4}
                                        style={{
                                            margin: 0,
                                            color:
                                                COLORS.text,
                                            fontSize: 18,
                                        }}
                                    >
                                        รายงานปัญหาถนน
                                    </Title>

                                    <Text
                                        style={{
                                            color:
                                                COLORS.secondary,
                                            fontSize: 13,
                                        }}
                                    >
                                        รายงานที่ผ่านการวิเคราะห์
                                        และจัดระดับความสำคัญโดย AI
                                    </Text>
                                </Col>

                                <Col>
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            color:
                                                COLORS.secondary,
                                        }}
                                    >
                                        แสดง{" "}
                                        <strong
                                            style={{
                                                color:
                                                    COLORS.text,
                                            }}
                                        >
                                            {
                                                filteredReports.length
                                            }
                                        </strong>{" "}
                                        จาก{" "}
                                        <strong
                                            style={{
                                                color:
                                                    COLORS.text,
                                            }}
                                        >
                                            {
                                                reports.length
                                            }
                                        </strong>{" "}
                                        รายการ
                                    </Text>
                                </Col>
                            </Row>
                        </div>

                        {/* =================================================
                            FILTER
                        ================================================= */}

                        <div
                            style={{
                                padding:
                                    "14px 20px",
                                background:
                                    "#FAFAFA",
                                borderBottom:
                                    `1px solid ${COLORS.border}`,
                            }}
                        >
                            <FilterBar
                                filters={filters}
                                onChange={
                                    setFilters
                                }
                            />
                        </div>

                        {/* =================================================
                            TABLE
                        ================================================= */}

                        <div
                            style={{
                                padding:
                                    "0 20px 20px",
                            }}
                        >
                            <ReportsTable
                                reports={
                                    filteredReports
                                }
                                loading={
                                    loading
                                }
                                onReportUpdated={
                                    loadReports
                                }
                            />
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default PriorityReportsPage;