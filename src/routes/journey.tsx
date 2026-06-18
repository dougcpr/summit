import { useQuery, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { GOAL_GRADE } from "../lib/grades";
import { getConsistencyBluePreference, setConsistencyBluePreference } from "../lib/preferences";
import { YearCalendar } from "../components/analytics/year-calendar";

export const Route = createFileRoute("/journey")({
  component: JourneyPage,
});

function JourneyPage() {
  const ensureCache = useMutation(api.analyticsCache.ensureCache);
  useEffect(() => { ensureCache({ goalGrade: GOAL_GRADE }); }, [GOAL_GRADE]);
  const [consistencyBlue, setConsistencyBlue] = useState(getConsistencyBluePreference);

  const toggleConsistencyBlue = (enabled: boolean) => {
    setConsistencyBlue(enabled);
    setConsistencyBluePreference(enabled);
  };

  const heatmap = useQuery(api.analytics.heatmapData);
  const timeline = useQuery(api.analytics.timelineMilestones, { goalGrade: GOAL_GRADE });
  const trainingData = useQuery(api.analytics.trainingByDate);
  const isEmpty = heatmap && heatmap.length < 10;

  if (heatmap && isEmpty) {
    return (
      <div
        className="p-4 font-display max-w-lg mx-auto flex items-center justify-center"
        style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}
      >
        <p className="text-center text-muted">
          Log some more climbs to see your journey!
        </p>
      </div>
    );
  }

  // Goal date from timeline (startDate + 52 weeks)
  const goalDateStr = timeline
    ? (() => {
        const d = new Date(timeline.endDate);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })()
    : null;

  return (
    <div
      className="p-4 pb-2 font-display max-w-lg mx-auto flex flex-col overflow-y-auto"
      style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}
    >
      {/* Year at a Glance */}
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted">Year at a Glance</span>
        <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted">
          Blue
          <input
            type="checkbox"
            className="peer sr-only"
            checked={consistencyBlue}
            onChange={(e) => toggleConsistencyBlue(e.currentTarget.checked)}
          />
          <span
            className="h-4 w-7 rounded-full border border-border/25 bg-border/10 p-0.5 transition-colors peer-checked:bg-accent/80"
            aria-hidden="true"
          >
            <span
              className="block h-3 w-3 rounded-full bg-card-bg shadow-sm transition-transform"
              style={{ transform: consistencyBlue ? "translateX(0.75rem)" : "translateX(0)" }}
            />
          </span>
        </label>
      </div>
      {heatmap && (
        <YearCalendar
          data={heatmap}
          trainingData={trainingData ?? []}
          goalDate={goalDateStr}
          singleColor={consistencyBlue}
        />
      )}
    </div>
  );
}
