import { useQuery, useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { GOAL_GRADE } from "../lib/grades";
import { Pyramid } from "../components/analytics/pyramid";
import { HoldTypeTimeline } from "../components/analytics/hold-type-timeline";
import { Focus } from "../components/analytics/focus";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const ensureCache = useMutation(api.analyticsCache.ensureCache);
  useEffect(() => { ensureCache({ goalGrade: GOAL_GRADE }); }, [GOAL_GRADE]);

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

      {/* Where I Am */}
      <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">
        Where I Am
      </div>
      <Pyramid goalGrade={GOAL_GRADE} />

      <hr className="border-border/30 my-1.5" />

      {/* Hold Levels */}
      <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">
        Hold Levels
      </div>
      <HoldTypeTimeline goalGrade={GOAL_GRADE} />
    </div>
  );
}
