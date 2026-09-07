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
                let intensity = 0.3;

                // ใช้ damage_level ที่ Backend classify มาแล้ว
                switch (report.damage_level) {
                    case "critical":
                        intensity = 1;
                        break;

                    case "warning":
                        intensity = 0.8;
                        break;

                    case "moderate":
                        intensity = 0.6;
                        break;

                    case "good":
                        intensity = 0.3;
                        break;

                    default:
                        intensity = 0.2;
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
            radius: 40,
            blur: 25,
            maxZoom: 17,
            minOpacity: 0.35,
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