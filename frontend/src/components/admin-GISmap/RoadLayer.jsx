import { GeoJSON } from "react-leaflet";
import roadGeoJson from "../../mock/roadGeoJson";

export default function RoadLayer({
    reports = [],
    onSelectRoad,
}) {
    // ========================================
    // ตรวจสอบว่า reports เป็น Array
    // ========================================
    const safeReports = Array.isArray(reports)
        ? reports
        : [];

    // ========================================
    // หา Reports ของถนน
    // ========================================
    const getRoadReports = (roadName) => {
        return safeReports.filter(
            (report) =>
                report.roadName === roadName
        );
    };

    // ========================================
    // Road Style
    // ========================================
    const styleRoad = (feature) => {
        const roadName =
            feature.properties?.roadName;

        const roadReports =
            getRoadReports(roadName);

        const hasCritical =
            roadReports.some(
                (report) =>
                    report.severity === "Critical"
            );

        const hasHigh =
            roadReports.some(
                (report) =>
                    report.severity === "High"
            );

        // Critical
        if (hasCritical) {
            return {
                color: "#ff4d4f",
                weight: 8,
                opacity: 0.9,
            };
        }

        // High
        if (hasHigh) {
            return {
                color: "#fa8c16",
                weight: 7,
                opacity: 0.9,
            };
        }

        // มีรายงานแต่ไม่รุนแรง
        if (roadReports.length > 0) {
            return {
                color: "#52c41a",
                weight: 5,
                opacity: 0.85,
            };
        }

        // ไม่มีรายงาน
        return {
            color: "#8c8c8c",
            weight: 4,
            opacity: 0.65,
        };
    };

    // ========================================
    // Feature Events
    // ========================================
    const onEachFeature = (
        feature,
        layer
    ) => {
        const roadName =
            feature.properties?.roadName ||
            "ไม่ทราบชื่อถนน";

        const roadReports =
            getRoadReports(roadName);

        layer.on({
            // ------------------------------
            // Mouse Over
            // ------------------------------
            mouseover() {
                layer.setStyle({
                    weight: 10,
                    opacity: 1,
                });
            },

            // ------------------------------
            // Mouse Out
            // ------------------------------
            mouseout() {
                layer.setStyle(
                    styleRoad(feature)
                );
            },

            // ------------------------------
            // Click
            // ------------------------------
            click() {
                onSelectRoad?.({
                    roadName,

                    // จำนวนรายงาน
                    reports:
                        roadReports.length,

                    // จำนวน Pending
                    pending:
                        roadReports.filter(
                            (report) =>
                                report.status ===
                                "Pending"
                        ).length,

                    // ระดับความรุนแรงสูงสุด
                    severity:
                        roadReports.length > 0
                            ? getHighestSeverity(
                                  roadReports
                              )
                            : "-",

                    // Reports จริงจาก Backend
                    reportList:
                        roadReports,
                });
            },
        });
    };

    // ========================================
    // Render
    // ========================================
    return (
        <GeoJSON
            data={roadGeoJson}
            style={styleRoad}
            onEachFeature={onEachFeature}
        />
    );
}

// ========================================
// หา Severity สูงสุดของถนน
// ========================================
function getHighestSeverity(reports) {
    const priority = {
        Critical: 4,
        High: 3,
        Medium: 2,
        Low: 1,
    };

    return reports.reduce(
        (highest, report) => {
            const current =
                priority[report.severity] || 0;

            const previous =
                priority[highest] || 0;

            return current > previous
                ? report.severity
                : highest;
        },
        "Low"
    );
}