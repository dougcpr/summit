import { useQuery, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { GOAL_GRADE } from "../lib/grades";
import { Pyramid } from "../components/analytics/pyramid";
import { HoldTypeTimeline } from "../components/analytics/hold-type-timeline";
import { RecentMonths } from "../components/analytics/recent-months";
import { CONSISTENCY_BLUE_CHANGE_EVENT, getConsistencyBluePreference } from "../lib/preferences";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const ensureCache = useMutation(api.analyticsCache.ensureCache);
  useEffect(() => { ensureCache({ goalGrade: GOAL_GRADE }); }, [GOAL_GRADE]);
  const [consistencyBlue, setConsistencyBlue] = useState(getConsistencyBluePreference);

  useEffect(() => {
    const refreshConsistencyBlue = () => setConsistencyBlue(getConsistencyBluePreference());
    window.addEventListener(CONSISTENCY_BLUE_CHANGE_EVENT, refreshConsistencyBlue);
    window.addEventListener("storage", refreshConsistencyBlue);
    return () => {
      window.removeEventListener(CONSISTENCY_BLUE_CHANGE_EVENT, refreshConsistencyBlue);
      window.removeEventListener("storage", refreshConsistencyBlue);
    };
  }, []);

  const heatmap = useQuery(api.analytics.heatmapData);
  const trainingData = useQuery(api.analytics.trainingByDate);
  const isEmpty = heatmap && heatmap.length < 10;

  if (heatmap && isEmpty) {
    return (
      <div
        className="p-4 font-display max-w-lg mx-auto flex items-center justify-center"
        style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}
      >
        <p className="text-center text-muted">
          Log some more climbs to see your analytics!
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-3 pb-2 font-display max-w-lg mx-auto flex flex-col justify-start gap-[clamp(0.375rem,1.1vh,0.75rem)] overflow-y-auto"
      style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}
    >
      <Pyramid goalGrade={GOAL_GRADE} />

      <hr className="border-border/15 my-[clamp(0.375rem,1vh,0.75rem)]" />

      {/* Hold Levels */}
      <div className="text-[10px] uppercase tracking-widest text-muted">
        Hold Levels
      </div>
      <HoldTypeTimeline goalGrade={GOAL_GRADE} />

      <hr className="border-border/15 my-[clamp(0.375rem,1vh,0.75rem)]" />

      {/* Consistency */}
      <div className="text-[10px] uppercase tracking-widest text-muted">
        Consistency
      </div>
      {heatmap && <RecentMonths data={heatmap} trainingData={trainingData ?? []} singleColor={consistencyBlue} />}
    </div>
  );
}
