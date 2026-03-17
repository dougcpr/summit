import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { JourneyTimeline } from "../components/analytics/journey-timeline";
import { Pyramid } from "../components/analytics/pyramid";
import { ActivityHeatmap } from "../components/analytics/activity-heatmap";
import { HighlightsCard } from "../components/analytics/highlights-card";
import { HoldTypeRing } from "../components/analytics/hold-type-ring";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [goalGrade, setGoalGrade] = useState(() => localStorage.getItem("summit-goal-grade") || "V5");

  const handleGoalChange = (g: string) => {
    setGoalGrade(g);
    localStorage.setItem("summit-goal-grade", g);
  };

  return (
    <div className="p-2 font-display max-w-lg mx-auto flex flex-col gap-1 overflow-hidden" style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}>
      <JourneyTimeline goalGrade={goalGrade} />
      <Pyramid goalGrade={goalGrade} onGoalChange={handleGoalChange} />
      <div className="flex gap-1 items-stretch">
        <div className="flex-1 min-w-0 flex">
          <HighlightsCard goalGrade={goalGrade} />
        </div>
        <div className="flex-1 min-w-0 flex">
          <HoldTypeRing goalGrade={goalGrade} />
        </div>
      </div>
      <ActivityHeatmap />

    </div>
  );
}
