import { useQuery, useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { GOAL_GRADE } from "../lib/grades";
import { JourneyTimeline } from "../components/analytics/journey-timeline";
import { HoldTypeTimeline } from "../components/analytics/hold-type-timeline";
import { YearCalendar } from "../components/analytics/year-calendar";

export const Route = createFileRoute("/journey")({
  component: JourneyPage,
});

function JourneyPage() {
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
          Log some more climbs to see your journey!
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-4 pb-2 font-display max-w-lg mx-auto flex flex-col justify-evenly overflow-hidden"
      style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}
    >
      {/* How I Got Here */}
      <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">
        How I Got Here
      </div>
      <JourneyTimeline goalGrade={GOAL_GRADE} />
      <div className="mt-1" />
      <HoldTypeTimeline goalGrade={GOAL_GRADE} />

      <hr className="border-border/30 my-1.5" />

      {/* Year at a Glance */}
      <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">
        Year at a Glance
      </div>
      {heatmap && <YearCalendar data={heatmap} />}
    </div>
  );
}
