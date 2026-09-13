import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

import "leaflet.heat";

export default function HeatmapLayer({ reports = [] }) {
    const map = useMap();

    useEffect(() => {
        // ========================================
        // Convert reports → heatmap points
        // ========================================

        const points = reports
            .filter(
                (report) =>
                    report.lat != null &&
                    report.lng != null
            )
            .map((report) => {
                let intensity = 0.15;

                // ใช้ damage_level จาก Backend
                switch (report.damage_level) {
                    case "critical":
                        // ความเสียหายรุนแรง
                        intensity = 1.0;
                        break;

                    case "warning":
                        // ควรเฝ้าระวัง
                        intensity = 0.75;
                        break;

                    case "moderate":
                        // ระดับปานกลาง
                        intensity = 0.50;
                        break;

                    case "good":
                        // สภาพปกติ
                        intensity = 0.15;
                        break;

                    default:
                        intensity = 0.10;
                }

                return [
                    Number(report.lat),
                    Number(report.lng),
                    intensity,
                ];
            });

        // ========================================
        // Create Heatmap
        // ========================================

        const heat = L.heatLayer(points, {
            radius: 42,
            blur: 28,

            maxZoom: 17,

            minOpacity: 0.25,

            max: 1.0,

            // ====================================
            // Heatmap Color
            //
            // เขียว → เหลือง → ส้ม → แดง
            // ====================================

            gradient: {
                0.00: "#22C55E",
                0.30: "#A3E635",
                0.50: "#FACC15",
                0.70: "#F97316",
                0.85: "#EF4444",
                1.00: "#B91C1C",
            },
        });

        heat.addTo(map);

        // ========================================
        // Cleanup
        // ========================================

        return () => {
            if (map.hasLayer(heat)) {
                map.removeLayer(heat);
            }
        };
    }, [map, reports]);

    return null;
}