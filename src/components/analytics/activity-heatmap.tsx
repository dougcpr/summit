import { useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { GRADES, colorMap } from "../../lib/grades";

const emptyColor = "#f6f1e3";
const CELL_SIZE = 18;
const CELL_GAP = 3;

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const data = useQuery(api.analytics.heatmapData);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data]);

  if (!data || data.length === 0) return <div className="h-8" />;

  // Find earliest date to start from
  const dates = data.map((d) => new Date(d.date));
  const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
  const earliestWeekStart = getWeekStart(earliest);
  const now = new Date();
  const currentWeekStart = getWeekStart(now);

  // Build all week buckets from earliest to now
  const weeks: { start: Date; days: number; avgGrade: number }[] = [];
  const cursor = new Date(earliestWeekStart);
  while (cursor <= currentWeekStart) {
    weeks.push({ start: new Date(cursor), days: 0, avgGrade: 0 });
    cursor.setDate(cursor.getDate() + 7);
  }

  // Index weeks by timestamp for fast lookup
  const weekIndex = new Map<number, number>();
  for (let i = 0; i < weeks.length; i++) {
    weekIndex.set(weeks[i].start.getTime(), i);
  }

  // Bucket heatmap data into weeks
  for (const entry of data) {
    const entryWeekStart = getWeekStart(new Date(entry.date));
    const idx = weekIndex.get(entryWeekStart.getTime());
    if (idx !== undefined) {
      weeks[idx].days++;
      weeks[idx].avgGrade += entry.count;
    }
  }

  // Finalize averages
  for (const week of weeks) {
    if (week.days > 0) {
      week.avgGrade = Math.round(week.avgGrade / week.days);
    }
  }

  const totalWeeks = weeks.length;
  const activeWeeks = weeks.filter((w) => w.days > 0).length;

  // Month labels at first week of each month
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

  const stripeWidth = weeks.length * (CELL_SIZE + CELL_GAP) - CELL_GAP;

  return (
    <div className="px-4">
      {/* Summary stat */}
      <div className="text-xs opacity-50 mb-2 text-center">
        {activeWeeks} of {totalWeeks} weeks active
      </div>

      <div ref={scrollRef} className="overflow-x-auto">
        {/* Month labels */}
        <div className="relative" style={{ width: stripeWidth, height: 12 }}>
          {monthLabels.map(({ index, label }) => (
            <span
              key={`${label}-${index}`}
              className="absolute text-[8px] opacity-40"
              style={{ left: index * (CELL_SIZE + CELL_GAP) }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Week stripe */}
        <div className="flex mt-1" style={{ gap: CELL_GAP, width: stripeWidth }}>
          {weeks.map((week, i) => {
            const grade = week.avgGrade > 0 ? GRADES[week.avgGrade - 1] : null;
            const fill = grade ? colorMap[grade] : emptyColor;
            const isActive = week.days > 0;

            return (
              <button
                key={i}
                className="rounded-md shrink-0"
                style={{
                  backgroundColor: fill,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
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
    </div>
  );
}
