import { useQuery } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { GRADES, colorMap } from "../../lib/grades";

const emptyColor = "#f6f1e3";
const WEEKS_TO_SHOW = 16;

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(date: Date): string {
  const month = date.toLocaleString("default", { month: "short" });
  return `${month} ${date.getDate()}`;
}

export function ActivityHeatmap() {
  const navigate = useNavigate();
  const data = useQuery(api.analytics.heatmapData);

  if (!data) return <div className="h-8" />;

  // Build week buckets for the last N weeks
  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  const weeks: { start: Date; days: number; avgGrade: number }[] = [];

  for (let i = WEEKS_TO_SHOW - 1; i >= 0; i--) {
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() - i * 7);
    weeks.push({ start, days: 0, avgGrade: 0 });
  }

  // Bucket heatmap data into weeks
  for (const entry of data) {
    const entryDate = new Date(entry.date);
    const entryWeekStart = getWeekStart(entryDate);

    for (const week of weeks) {
      if (week.start.getTime() === entryWeekStart.getTime()) {
        week.days++;
        // Running average: accumulate then divide
        week.avgGrade = week.avgGrade + entry.count;
        break;
      }
    }
  }

  // Finalize averages
  for (const week of weeks) {
    if (week.days > 0) {
      week.avgGrade = Math.round(week.avgGrade / week.days);
    }
  }

  const activeWeeks = weeks.filter((w) => w.days > 0).length;

  // Pick month labels — show at first week of each month
  const monthLabels: { index: number; label: string }[] = [];
  let lastMonth = -1;
  for (let i = 0; i < weeks.length; i++) {
    const month = weeks[i].start.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({
        index: i,
        label: weeks[i].start.toLocaleString("default", { month: "short" }),
      });
      lastMonth = month;
    }
  }

  return (
    <div className="px-4">
      {/* Summary stat */}
      <div className="text-xs opacity-50 mb-2 text-center">
        {activeWeeks} of {WEEKS_TO_SHOW} weeks active
      </div>

      {/* Month labels */}
      <div className="flex mb-1" style={{ gap: 0 }}>
        {weeks.map((_, i) => {
          const label = monthLabels.find((m) => m.index === i);
          return (
            <div key={i} className="flex-1 text-center">
              {label && (
                <span className="text-[8px] opacity-40">{label.label}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Week stripe */}
      <div className="flex gap-[3px]">
        {weeks.map((week, i) => {
          const grade = week.avgGrade > 0 ? GRADES[week.avgGrade - 1] : null;
          const fill = grade ? colorMap[grade] : emptyColor;
          const isActive = week.days > 0;

          return (
            <button
              key={i}
              className="flex-1 rounded-md transition-all"
              style={{
                backgroundColor: fill,
                aspectRatio: "1",
                border: isActive ? "none" : "1px solid rgba(59,59,59,0.1)",
                cursor: isActive ? "pointer" : "default",
              }}
              onClick={() => {
                if (isActive) {
                  const d = week.start;
                  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                  navigate({ to: "/log", search: { date: dateStr } });
                }
              }}
              title={isActive ? `${formatWeekLabel(week.start)}: ${week.days} day${week.days > 1 ? "s" : ""}` : ""}
            />
          );
        })}
      </div>
    </div>
  );
}
