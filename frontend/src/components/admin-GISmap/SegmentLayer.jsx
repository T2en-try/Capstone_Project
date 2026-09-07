import { Fragment } from "react";
import { GeoJSON, Popup, Tooltip } from "react-leaflet";

const SEGMENT_COLORS = {
  1: "#52c41a",
  2: "#fa8c16",
  3: "#ff4d4f",
};

const getClassValue = (point) => {
  const value = Number(point.priority_class);
  return [1, 2, 3].includes(value) ? value : null;
};

const getPriorityLabel = (priorityClass) => ({
  1: "Good (สภาพปกติ)",
  2: "Warning (ควรเฝ้าระวัง)",
  3: "Critical (ต้องซ่อมแซมด่วน)",
}[priorityClass] || "ยังไม่มีผลวิเคราะห์");

export default function SegmentLayer({ reports = [], segments = [] }) {
  const pointsBySegment = new Map();
  reports.forEach((point) => {
    if (point.osm_way_id == null) return;
    const key = String(point.osm_way_id);
    const current = pointsBySegment.get(key) || [];
    current.push(point);
    pointsBySegment.set(key, current);
  });

  return Array.from(pointsBySegment.entries()).map(([segmentId, points]) => {
    const ranked = [...points].sort(
      (a, b) => (getClassValue(b) || 0) - (getClassValue(a) || 0)
    );
    const worstClass = getClassValue(ranked[0]);
    const color = SEGMENT_COLORS[worstClass] || "#8c8c8c";
    const summary = segments.find((item) => String(item.segment_id) === segmentId);
    if (!summary?.geometry) return null;

    const style = {
      color,
      weight: worstClass === 3 ? 7 : worstClass === 2 ? 5 : 3,
      opacity: 0.85,
    };

    return (
      <Fragment key={segmentId}>
        <GeoJSON
          data={summary.geometry}
          style={style}
          eventHandlers={{
            mouseover: (event) => event.target.setStyle({ ...style, weight: style.weight + 3 }),
            mouseout: (event) => event.target.setStyle(style),
          }}
        >
          <Tooltip sticky>OSM Way {segmentId}</Tooltip>
          <Popup>
            <strong>Road Segment {segmentId}</strong>
            <p>Priority: {getPriorityLabel(worstClass)}</p>
            <p>Priority Score: {summary?.priority_score == null ? "-" : Number(summary.priority_score).toFixed(2)}</p>
            <p>จำนวนจุดรายงาน: {summary?.report_count ?? points.length}</p>
            {summary?.road_name && <p>ถนน: {summary.road_name}</p>}
            <p>จุดที่แย่ที่สุด: Report #{summary?.worst_report_id ?? ranked[0]?.id}</p>
            <p>Reports: {summary?.report_ids?.join(", ") || points.map((point) => point.id).join(", ")}</p>
          </Popup>
        </GeoJSON>
      </Fragment>
    );
  });
}
