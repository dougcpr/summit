import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pyramid } from "../components/analytics/pyramid";
import { ActivityHeatmap } from "../components/analytics/activity-heatmap";
import { WeeklyZones } from "../components/analytics/weekly-zones";

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
    <div className="p-2 font-display max-w-lg mx-auto flex flex-col gap-1.5 overflow-hidden" style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}>
      <Pyramid goalGrade={goalGrade} onGoalChange={handleGoalChange} />
      <WeeklyZones goalGrade={goalGrade} />
      <ActivityHeatmap />

    </div>
  );
}
