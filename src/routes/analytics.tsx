import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pyramid } from "../components/analytics/pyramid";
import { ActivityHeatmap } from "../components/analytics/activity-heatmap";
import { HoldTypeRing } from "../components/analytics/hold-type-ring";
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
    <div className="p-4 font-display max-w-lg mx-auto flex flex-col gap-4">
      <Pyramid goalGrade={goalGrade} onGoalChange={handleGoalChange} />
      <ActivityHeatmap />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HoldTypeRing />
        <WeeklyZones goalGrade={goalGrade} />
      </div>
    </div>
  );
}
