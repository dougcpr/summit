import { useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { Moon } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import { GRADES, colorMap, borderColorMap } from "../../lib/grades";

const emptyColor = "var(--color-neutral-bg)";
const CELL_SIZE = 24;
const CELL_GAP = 3;

// Grades whose backgrounds are too dark for dark text
const lightTextGrades = new Set(["V4", "V5", "V6", "V7", "V8", "V10"]);

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export function ActivityHeatmap() {
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

  // Find first active week index to distinguish "before journey" from "rest"
  const firstActiveIdx = weeks.findIndex((w) => w.days > 0);

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

  // Build color for each week
  const weekColors = weeks.map((week, i) => {
    const grade = week.avgGrade > 0 ? GRADES[week.avgGrade - 1] : null;
    const fill = grade ? colorMap[grade] : emptyColor;
    const isActive = week.days > 0;
    const isRest = !isActive && i > firstActiveIdx;
    return { fill, isActive, isRest };
  });

  // Group consecutive weeks with the same color
  const groups: {
    startIdx: number;
    count: number;
    fill: string;
    isActive: boolean;
    isRest: boolean;
    weeks: typeof weeks;
  }[] = [];
  for (let i = 0; i < weeks.length; i++) {
    const prev = groups[groups.length - 1];
    if (prev && prev.fill === weekColors[i].fill) {
      prev.count++;
      prev.weeks.push(weeks[i]);
    } else {
      groups.push({
        startIdx: i,
        count: 1,
        fill: weekColors[i].fill,
        isActive: weekColors[i].isActive,
        isRest: weekColors[i].isRest,
        weeks: [weeks[i]],
      });
    }
  }

  const stripeWidth = weeks.length * (CELL_SIZE + CELL_GAP) - CELL_GAP;

  return (
    <div className="px-4">
      {/* Summary stat */}
      <div className="text-xs opacity-50 mb-1 text-center">
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

        {/* Week stripe with merged cells */}
        <div className="flex mt-1" style={{ gap: CELL_GAP, width: stripeWidth }}>
          {groups.map((group) => {
            const groupWidth =
              group.count * CELL_SIZE + (group.count - 1) * CELL_GAP;

            // Grade label for active groups
            const grade =
              group.isActive && group.weeks[0].avgGrade > 0
                ? GRADES[group.weeks[0].avgGrade - 1]
                : null;

            return (
              <div
                key={group.startIdx}
                className="rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
                style={{
                  backgroundColor: group.fill,
                  width: groupWidth,
                  height: CELL_SIZE,
                  border: grade
                    ? `2px solid ${borderColorMap[grade] || group.fill}`
                    : "1px solid rgba(59,59,59,0.1)",
                }}
              >
                {group.isRest && (
                  <Moon size={10} weight="fill" className="opacity-20" />
                )}
                {grade && (
                  <span
                    className="font-display text-[10px] leading-none select-none"
                    style={{
                      whiteSpace: "nowrap",
                      color: lightTextGrades.has(grade)
                        ? "white"
                        : "var(--color-border)",
                    }}
                  >
                    {grade}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
