import { useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import HeatMap from "@uiw/react-heat-map";
import { api } from "@convex/_generated/api";

// count = avg grade + 1 (1=V0, 2=V1, ..., 11=V10)
const gradeColors: Record<number, string> = {
  0: "#f6f1e3",
  1: "rgba(106, 153, 78, 0.8)",  // V0 green
  2: "rgba(217, 108, 79, 0.8)",  // V1 orange
  3: "rgba(228, 196, 77, 0.8)",  // V2 yellow
  4: "rgba(89, 149, 163, 0.8)",  // V3 teal
  5: "rgba(120, 120, 120, 0.6)", // V4 gray (lightened)
  6: "rgba(78, 104, 168, 0.8)",  // V5 blue
  7: "rgba(133, 94, 152, 0.8)",  // V6 purple
  8: "rgba(179, 84, 57, 0.8)",   // V7 burnt orange
  9: "rgba(72, 111, 77, 0.8)",   // V8 dark green
  10: "rgba(212, 136, 132, 0.8)", // V9 pink
  11: "rgba(140, 140, 140, 0.8)", // V10 gray
};

export function ActivityHeatmap() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const data = useQuery(api.analytics.heatmapData);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data]);

  if (!data) return null;

  const heatData = data.map((d) => ({
    date: d.date.replace(/-/g, "/"),
    count: d.count,
  }));

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 1);

  // Start from earliest data point
  const dates = data.map((d) => new Date(d.date));
  const startDate = dates.length > 0
    ? new Date(Math.min(...dates.map((d) => d.getTime())))
    : new Date(endDate.getFullYear(), endDate.getMonth() - 2, 1);

  // ~17px per week column
  const weeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const width = Math.max(220, weeks * 14 + 40);

  return (
    <div ref={scrollRef} className="border-2 border-border rounded-lg p-2 bg-card-bg overflow-x-auto">
      <HeatMap
        value={heatData}
        width={width}
        startDate={startDate}
        endDate={endDate}
        rectSize={12}
        space={2}
        legendCellSize={0}
        style={{ color: "var(--color-border)" }}
        panelColors={gradeColors}
        rectProps={{ rx: 6 }}
        rectRender={(props, data) => {
          if (!data.count) return <rect {...props} />;
          return (
            <rect
              {...props}
              onClick={() => {
                const dateStr = data.date.replace(/\//g, "-");
                navigate({ to: "/log", search: { date: dateStr } });
              }}
              style={{ cursor: "pointer" }}
            />
          );
        }}
      />
    </div>
  );
}
