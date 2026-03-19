import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { computeObservations } from "../../lib/use-observations";

const dotColors: Record<string, string> = {
  milestone: "rgba(106, 153, 78, 0.8)",   // green
  imbalance: "rgba(89, 149, 163, 0.8)",   // teal
  consistency: "rgba(106, 153, 78, 0.8)", // green
  goal: "rgba(228, 196, 77, 0.8)",        // gold
  volume: "rgba(217, 108, 79, 0.8)",      // coral
};

export function Observations({ goalGrade }: { goalGrade: string }) {
  const pyramid = useQuery(api.analytics.pyramid, { goalGrade });
  const holdTypes = useQuery(api.analytics.holdTypeBreakdown, { goalGrade });
  const heatmap = useQuery(api.analytics.heatmapData);
  const timelines = useQuery(api.analytics.holdTypeTimelines, { goalGrade });

  const observations = computeObservations(goalGrade, pyramid, holdTypes, heatmap, timelines);

  if (observations.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5 py-2">
      {observations.map((obs, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div
            className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
            style={{ backgroundColor: dotColors[obs.type] || "var(--color-border)" }}
          />
          <span className="text-sm opacity-70">{obs.message}</span>
        </div>
      ))}
    </div>
  );
}
