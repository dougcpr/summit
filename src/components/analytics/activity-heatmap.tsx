import { useQuery } from "convex/react";
import HeatMap from "@uiw/react-heat-map";
import { api } from "../../convex/_generated/api";
import { colorMap } from "../../lib/grades";

export function ActivityHeatmap() {
  const data = useQuery(api.analytics.heatmapData);

  if (!data) return null;

  const heatData = data.map((d) => ({
    date: d.date,
    count: d.count,
  }));

  // Last 6 months
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  return (
    <div className="border-2 border-border rounded-lg p-4 bg-card-bg overflow-x-auto">
      <h3 className="text-lg mb-2">Activity</h3>
      <HeatMap
        value={heatData}
        width={500}
        startDate={startDate}
        endDate={endDate}
        rectSize={12}
        space={3}
        legendCellSize={0}
        style={{ color: "var(--color-border)" }}
        panelColors={{
          0: "#f6f1e3",
          1: colorMap.V0.replace("0.8)", "0.6)"),
          3: colorMap.V2.replace("0.8)", "0.7)"),
          5: colorMap.V4.replace("0.8)", "0.8)"),
          8: colorMap.V6.replace("0.8)", "0.9)"),
        }}
        rectProps={{ rx: 2 }}
      />
    </div>
  );
}
