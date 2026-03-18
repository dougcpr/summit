import { useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { JourneyTimeline } from "../components/analytics/journey-timeline";
import { Pyramid } from "../components/analytics/pyramid";
import { ActivityHeatmap } from "../components/analytics/activity-heatmap";
import { HoldTypeTimeline } from "../components/analytics/hold-type-timeline";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [goalGrade, setGoalGrade] = useState(() => localStorage.getItem("summit-goal-grade") || "V5");
  const [showHeatmap, setShowHeatmap] = useState(false);

  const handleGoalChange = (g: string) => {
    setGoalGrade(g);
    localStorage.setItem("summit-goal-grade", g);
  };

  return (
    <div className="p-2 font-display max-w-lg mx-auto flex flex-col gap-1 overflow-hidden" style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}>
      <JourneyTimeline goalGrade={goalGrade} />
      <Pyramid goalGrade={goalGrade} onGoalChange={handleGoalChange} />
      <HoldTypeTimeline goalGrade={goalGrade} />
      <button
        onClick={() => setShowHeatmap(!showHeatmap)}
        className="flex items-center gap-1.5 text-xs border-2 border-border rounded-full px-4 py-1.5 bg-card-bg active:brightness-95 mx-auto"
      >
        Activity {showHeatmap ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
      </button>
      {showHeatmap && <ActivityHeatmap />}

    </div>
  );
}
