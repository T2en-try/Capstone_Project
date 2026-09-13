import { Fragment } from "react";
import { GeoJSON, Popup, Tooltip } from "react-leaflet";

// =====================================================
// Colors
// =====================================================

const SEGMENT_COLORS = {
  1: "#16A34A", // Good
  2: "#F59E0B", // Warning
  3: "#DC2626", // Critical
};

const SEGMENT_BG = {
  1: "#F0FDF4",
  2: "#FFFBEB",
  3: "#FEF2F2",
};

// =====================================================
// Priority Class
// =====================================================

const getClassValue = (point) => {
  const value = Number(point?.priority_class);

  return [1, 2, 3].includes(value)
    ? value
    : null;
};

// =====================================================
// Priority Label
// =====================================================

const getPriorityLabel = (priorityClass) => {
  const labels = {
    1: "Good",
    2: "Warning",
    3: "Critical",
  };

  return labels[priorityClass] || "ยังไม่มีผลวิเคราะห์";
};

// =====================================================
// Priority Description
// =====================================================

const getPriorityDescription = (priorityClass) => {
  const descriptions = {
    1: "สภาพปกติ",
    2: "ควรเฝ้าระวัง",
    3: "ต้องซ่อมแซมด่วน",
  };

  return descriptions[priorityClass] || "ไม่สามารถระบุระดับได้";
};

// =====================================================
// Segment Style
// =====================================================

const getSegmentStyle = (priorityClass) => {
  const color =
    SEGMENT_COLORS[priorityClass] || "#94A3B8";

  let weight = 3;

  if (priorityClass === 3) {
    weight = 7;
  } else if (priorityClass === 2) {
    weight = 5;
  }

  return {
    color,
    weight,
    opacity: 0.85,
    lineCap: "round",
    lineJoin: "round",
  };
};

// =====================================================
// Component
// =====================================================

export default function SegmentLayer({
  reports = [],
  segments = [],
}) {
  // ---------------------------------------------------
  // Group reports by OSM Way
  // ---------------------------------------------------

  const pointsBySegment = new Map();

  reports.forEach((point) => {
    if (point?.osm_way_id == null) {
      return;
    }

    const key = String(point.osm_way_id);

    const current =
      pointsBySegment.get(key) || [];

    current.push(point);

    pointsBySegment.set(key, current);
  });

  // ---------------------------------------------------
  // Render Segments
  // ---------------------------------------------------

  return Array.from(
    pointsBySegment.entries()
  ).map(([segmentId, points]) => {
    // -----------------------------------------------
    // Rank reports by priority
    // -----------------------------------------------

    const ranked = [...points].sort(
      (a, b) =>
        (getClassValue(b) || 0) -
        (getClassValue(a) || 0)
    );

    // -----------------------------------------------
    // Find Segment Summary
    // -----------------------------------------------

    const summary = segments.find(
      (item) =>
        String(item.segment_id) ===
        segmentId
    );

    // -----------------------------------------------
    // No Geometry
    // -----------------------------------------------

    if (!summary?.geometry) {
      return null;
    }

    // -----------------------------------------------
    // Determine Priority
    //
    // Prefer summary from backend.
    // Fallback to report points.
    // -----------------------------------------------

    const summaryClass =
      getClassValue(summary);

    const pointClass =
      getClassValue(ranked[0]);

    const worstClass =
      summaryClass ?? pointClass;

    // -----------------------------------------------
    // Colors / Style
    // -----------------------------------------------

    const color =
      SEGMENT_COLORS[worstClass] ||
      "#94A3B8";

    const background =
      SEGMENT_BG[worstClass] ||
      "#F8FAFC";

    const style =
      getSegmentStyle(worstClass);

    const priorityLabel =
      getPriorityLabel(worstClass);

    const priorityDescription =
      getPriorityDescription(worstClass);

    // -----------------------------------------------
    // Report IDs
    // -----------------------------------------------

    const reportIds =
      summary?.report_ids?.length
        ? summary.report_ids
        : points
            .map((point) => point.id)
            .filter(Boolean);

    // -----------------------------------------------
    // Worst Report
    // -----------------------------------------------

    const worstReportId =
      summary?.worst_report_id ??
      ranked[0]?.id ??
      "-";

    // -----------------------------------------------
    // Report Count
    // -----------------------------------------------

    const reportCount =
      summary?.report_count ??
      points.length;

    // -----------------------------------------------
    // Priority Score
    // -----------------------------------------------

    const priorityScore =
      summary?.priority_score == null
        ? null
        : Number(summary.priority_score);

    return (
      <Fragment key={segmentId}>
        <GeoJSON
          data={summary.geometry}
          style={style}
          eventHandlers={{
            mouseover: (event) => {
              event.target.setStyle({
                ...style,
                weight: style.weight + 3,
                opacity: 1,
              });
            },

            mouseout: (event) => {
              event.target.setStyle(style);
            },
          }}
        >
          {/* =================================================
              TOOLTIP
          ================================================= */}

          <Tooltip
            sticky
            direction="top"
            opacity={0.95}
          >
            <div
              style={{
                minWidth: 150,
                fontFamily:
                  "Arial, sans-serif",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#1F2937",
                }}
              >
                Road Segment
              </div>

              <div
                style={{
                  marginTop: 2,
                  fontSize: 11,
                  color: "#64748B",
                }}
              >
                OSM Way {segmentId}
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  color,
                }}
              >
                {priorityLabel}
              </div>
            </div>
          </Tooltip>

          {/* =================================================
              POPUP
          ================================================= */}

          <Popup
            maxWidth={320}
            minWidth={280}
          >
            <div
              style={{
                fontFamily:
                  "Arial, sans-serif",
                color: "#1F2937",
              }}
            >
              {/* -------------------------------------------
                  Header
              ------------------------------------------- */}

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent:
                    "space-between",
                  gap: 12,
                  paddingBottom: 10,
                  borderBottom:
                    "1px solid #E5E7EB",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#111827",
                    }}
                  >
                    Road Segment
                  </div>

                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 11,
                      color: "#94A3B8",
                    }}
                  >
                    OSM Way {segmentId}
                  </div>
                </div>

                {/* Priority Badge */}

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding:
                      "4px 8px",
                    borderRadius: 6,
                    background,
                    color,
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: color,
                    }}
                  />

                  {priorityLabel}
                </div>
              </div>

              {/* -------------------------------------------
                  Priority Description
              ------------------------------------------- */}

              <div
                style={{
                  marginTop: 10,
                  padding: "8px 10px",
                  borderRadius: 6,
                  background,
                  borderLeft:
                    `3px solid ${color}`,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#64748B",
                  }}
                >
                  ระดับความสำคัญ
                </div>

                <div
                  style={{
                    marginTop: 2,
                    fontSize: 12,
                    fontWeight: 600,
                    color,
                  }}
                >
                  {priorityLabel}
                  {" "}
                  <span
                    style={{
                      fontWeight: 400,
                      color: "#475569",
                    }}
                  >
                    ({priorityDescription})
                  </span>
                </div>
              </div>

              {/* -------------------------------------------
                  Information
              ------------------------------------------- */}

              <div
                style={{
                  marginTop: 10,
                }}
              >
                {/* Road Name */}

                {summary?.road_name && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: 12,
                      padding:
                        "6px 0",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: "#64748B",
                      }}
                    >
                      ถนน
                    </span>

                    <span
                      style={{
                        maxWidth: 180,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#1F2937",
                        textAlign: "right",
                      }}
                    >
                      {summary.road_name}
                    </span>
                  </div>
                )}

                {/* Priority Score */}

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 12,
                    padding:
                      "6px 0",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: "#64748B",
                    }}
                  >
                    Priority Score
                  </span>

                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color,
                    }}
                  >
                    {priorityScore == null
                      ? "-"
                      : priorityScore.toFixed(2)}
                  </span>
                </div>

                {/* Report Count */}

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 12,
                    padding:
                      "6px 0",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: "#64748B",
                    }}
                  >
                    จำนวนรายงาน
                  </span>

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#1F2937",
                    }}
                  >
                    {reportCount} รายการ
                  </span>
                </div>

                {/* Worst Report */}

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 12,
                    padding:
                      "6px 0",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: "#64748B",
                    }}
                  >
                    จุดที่แย่ที่สุด
                  </span>

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#1F2937",
                    }}
                  >
                    Report #{worstReportId}
                  </span>
                </div>
              </div>

              {/* -------------------------------------------
                  Reports
              ------------------------------------------- */}

              {reportIds.length > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 9,
                    borderTop:
                      "1px solid #E5E7EB",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "#94A3B8",
                      marginBottom: 5,
                    }}
                  >
                    รายงานที่อยู่ใน Segment
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 4,
                    }}
                  >
                    {reportIds.map(
                      (reportId) => (
                        <span
                          key={reportId}
                          style={{
                            padding:
                              "3px 6px",
                            borderRadius: 4,
                            background:
                              "#F1F5F9",
                            color:
                              "#475569",
                            fontSize: 10,
                            fontWeight: 500,
                          }}
                        >
                          #{reportId}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </Popup>
        </GeoJSON>
      </Fragment>
    );
  });
}