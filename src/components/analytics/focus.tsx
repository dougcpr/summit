import { useQuery } from "convex/react";
import { Moon, Target } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import { GRADES } from "../../lib/grades";

const WORK_WEEKS = 4;
const REST_DAYS = 5;

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export function Focus({ goalGrade }: { goalGrade: string }) {
  const heatmap = useQuery(api.analytics.heatmapData);
  const holdTypes = useQuery(api.analytics.holdTypeBreakdown, { goalGrade });

  if (!heatmap || !holdTypes) return null;

  // Count consecutive active weeks ending at current week
  const now = new Date();
  const currentWeekStart = getWeekStart(now);

  // Build set of active week timestamps
  const activeWeeks = new Set<number>();
  for (const entry of heatmap) {
    const weekStart = getWeekStart(new Date(entry.date));
    activeWeeks.add(weekStart.getTime());
  }

  // Count streak of consecutive active weeks going backwards from current
  let streak = 0;
  const cursor = new Date(currentWeekStart);
  while (activeWeeks.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }

  // Check if we're in a rest week: last active week ended a streak of 4+
  // and it's been fewer than REST_DAYS since the last climb
  const lastClimbDate = heatmap.length > 0
    ? new Date(Math.max(...heatmap.map((d) => new Date(d.date).getTime())))
    : null;

  const daysSinceLastClimb = lastClimbDate
    ? Math.floor((now.getTime() - lastClimbDate.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  // Determine if rest is needed
  const needsRest = streak >= WORK_WEEKS;
  const inRestPeriod = !activeWeeks.has(currentWeekStart.getTime()) && daysSinceLastClimb <= REST_DAYS && daysSinceLastClimb > 0;
  const restDaysRemaining = inRestPeriod ? Math.max(0, REST_DAYS - daysSinceLastClimb) : REST_DAYS;

  if (needsRest || inRestPeriod) {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        <Moon size={16} weight="fill" className="opacity-40" />
        <span className="text-sm opacity-70">
          {inRestPeriod
            ? `Rest — ${restDaysRemaining} day${restDaysRemaining !== 1 ? "s" : ""} remaining`
            : `Rest — take ${REST_DAYS} days off`
          }
        </span>
      </div>
    );
  }

  // Find weakest hold type and suggest focus at goal - 1
  const goalIdx = GRADES.indexOf(goalGrade as (typeof GRADES)[number]);
  const focusGrade = goalIdx > 0 ? GRADES[goalIdx - 1] : GRADES[0];
  const weakest = holdTypes.types.reduce((a, b) =>
    a.gradeLevelIdx < b.gradeLevelIdx ? a : b
  );

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <Target size={16} weight="fill" className="opacity-40" />
      <span className="text-sm opacity-70">
        Focus: {focusGrade} {weakest.type}s
      </span>
    </div>
  );
}
