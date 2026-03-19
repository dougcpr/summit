import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { GRADES } from "../lib/grades";
import { Pyramid } from "../components/analytics/pyramid";
import { HoldTypeSummary } from "../components/analytics/hold-type-summary";
import { JourneyTimeline } from "../components/analytics/journey-timeline";
import { HoldTypeTimeline } from "../components/analytics/hold-type-timeline";
import { ActivityHeatmap } from "../components/analytics/activity-heatmap";
import { Observations } from "../components/analytics/observations";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [goalGrade, setGoalGrade] = useState(
    () => localStorage.getItem("summit-goal-grade") || "V5",
  );

  const handleGoalChange = (g: string) => {
    setGoalGrade(g);
    localStorage.setItem("summit-goal-grade", g);
  };

  // Empty state check
  const heatmap = useQuery(api.analytics.heatmapData);
  const isEmpty = heatmap && heatmap.length < 10;

  if (heatmap && isEmpty) {
    return (
      <div
        className="p-4 font-display max-w-lg mx-auto flex items-center justify-center overflow-y-auto"
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
      className="p-2 font-display max-w-lg mx-auto overflow-y-auto"
      style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}
    >
      {/* Goal grade selector */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-xs opacity-50">Goal</span>
        <select
          value={goalGrade}
          onChange={(e) => handleGoalChange(e.target.value)}
          className="text-xs font-display bg-transparent border border-border rounded px-1.5 py-0.5"
        >
          {GRADES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* Chapter 1: Where I Am */}
      <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">
        Where I Am
      </div>
      <Pyramid goalGrade={goalGrade} />
      <HoldTypeSummary goalGrade={goalGrade} />

      <hr className="border-border/30 my-4" />

      {/* Chapter 2: How I Got Here */}
      <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">
        How I Got Here
      </div>
      <JourneyTimeline goalGrade={goalGrade} />
      <div className="mt-3" />
      <HoldTypeTimeline goalGrade={goalGrade} />
      <div className="mt-3" />
      <ActivityHeatmap />

      <hr className="border-border/30 my-4" />

      {/* Chapter 3: What's Next */}
      <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">
        What's Next
      </div>
      <Observations goalGrade={goalGrade} />

      <div className="h-8" />
    </div>
  );
}
