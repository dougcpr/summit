import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pyramid } from "../components/analytics/pyramid";
import { ActivityHeatmap } from "../components/analytics/activity-heatmap";
import { WeeklyZones } from "../components/analytics/weekly-zones";
import { SendRate } from "../components/analytics/send-rate";

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
    <div className="p-2 font-display max-w-lg mx-auto flex flex-col gap-1.5 h-[calc(100dvh-4rem)] overflow-hidden">
      <Pyramid goalGrade={goalGrade} onGoalChange={handleGoalChange} />
      <div className="grid grid-cols-2 gap-1.5 shrink-0">
        <SendRate goalGrade={goalGrade} />
        <WeeklyZones goalGrade={goalGrade} />
      </div>
      <ActivityHeatmap />

    </div>
  );
}
