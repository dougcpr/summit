import { useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import HeatMap from "@uiw/react-heat-map";
import { api } from "@convex/_generated/api";
import { GRADES, colorMap } from "../../lib/grades";

const emptyColor = "#f6f1e3";

// count = avg grade + 1 (1=V0, 2=V1, ..., 11=V10)
function countToFill(count: number): string {
  if (!count) return emptyColor;
  const grade = GRADES[count - 1];
  return grade ? colorMap[grade] : emptyColor;
}

export function ActivityHeatmap() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const data = useQuery(api.analytics.heatmapData);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data]);

  if (!data) return <div className="border-2 border-border rounded-lg p-2 bg-card-bg h-[9.5rem]" />;

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
  const width = Math.max(220, weeks * 18 + 40);

  return (
    <div className="border-2 border-border rounded-lg p-2 bg-card-bg">
      <div ref={scrollRef} className="overflow-x-auto">
      <HeatMap
        value={heatData}
        width={width}
        startDate={startDate}
        endDate={endDate}
        rectSize={16}
        space={2}
        legendCellSize={0}
        style={{ color: "var(--color-border)" }}
        panelColors={{ 0: emptyColor, 1: emptyColor }}
        rectProps={{ rx: 8 }}
        rectRender={(props, data) => {
          const fill = countToFill(data.count || 0);
          if (!data.count) return <rect {...props} fill={fill} />;
          return (
            <rect
              {...props}
              fill={fill}
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
    </div>
  );
}
