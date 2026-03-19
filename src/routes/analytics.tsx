import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { Pyramid } from "../components/analytics/pyramid";
import { JourneyTimeline } from "../components/analytics/journey-timeline";
import { HoldTypeTimeline } from "../components/analytics/hold-type-timeline";
import { ActivityHeatmap } from "../components/analytics/activity-heatmap";
import { Focus } from "../components/analytics/focus";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

const GOAL_GRADE = "V5";

function AnalyticsPage() {
  // Empty state check
  const heatmap = useQuery(api.analytics.heatmapData);
  const isEmpty = heatmap && heatmap.length < 10;

  if (heatmap && isEmpty) {
    return (
      <div
        className="p-4 font-display max-w-lg mx-auto flex items-center justify-center"
        style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}
      >
        <p className="text-center opacity-50">
          Log some more climbs to see your analytics!
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-4 pb-2 font-display max-w-lg mx-auto flex flex-col justify-evenly overflow-hidden"
      style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}
    >
      {/* Focus */}
      <Focus goalGrade={GOAL_GRADE} />

      {/* Chapter 1: Where I Am */}
      <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">
        Where I Am
      </div>
      <Pyramid goalGrade={GOAL_GRADE} />

      <hr className="border-border/30 my-1.5" />

      {/* Chapter 2: How I Got Here */}
      <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">
        How I Got Here
      </div>
      <JourneyTimeline goalGrade={GOAL_GRADE} />
      <div className="mt-1" />
      <HoldTypeTimeline goalGrade={GOAL_GRADE} />
      <hr className="border-border/30 my-1.5" />

      {/* Chapter 3: Activity */}
      <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">
        Activity
      </div>
      <ActivityHeatmap />
    </div>
  );
}
