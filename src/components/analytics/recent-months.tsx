import { useNavigate } from "@tanstack/react-router";
import { Moon } from "@phosphor-icons/react";
import { GRADES, colorMap } from "../../lib/grades";

const EMPTY_COLOR = "var(--color-neutral-bg)";
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];
const lightTextGrades = new Set(["V4", "V5", "V6", "V7", "V8", "V10"]);

interface HeatmapEntry {
  date: string;   // "YYYY-MM-DD"
  count: number;  // 1-based weighted average grade index
}

interface TrainingEntry {
  date: string;
  count: number;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function RecentMonths({
  data,
  trainingData = [],
}: {
  data: HeatmapEntry[];
  trainingData?: TrainingEntry[];
}) {
  const navigate = useNavigate();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const sortedDates = data.map((d) => d.date).sort();
  const earliestDate = sortedDates.length > 0 ? sortedDates[0] : todayStr;

  // Build lookup map
  const dayMap = new Map<string, number>();
  for (const entry of data) {
    dayMap.set(entry.date, entry.count);
  }

  const trainingMap = new Map<string, number>();
  for (const entry of trainingData) {
    trainingMap.set(entry.date, entry.count);
  }

  // Previous month and current month
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const months = [
    { year: prevYear, month: prevMonth, isCurrent: false },
    { year: currentYear, month: currentMonth, isCurrent: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-3">
      {months.map(({ year, month, isCurrent }) => {
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        return (
          <div key={`${year}-${month}`} className={`border border-border/15 rounded-md px-1.5 py-1${isCurrent ? " border-border/40" : ""}`}>
            <div className="text-[8px] uppercase tracking-wider text-muted text-center mb-1 font-bold">
              {MONTH_NAMES[month]}
            </div>
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 gap-[2px] mb-0.5">
              {DAY_HEADERS.map((d, i) => (
                <div key={i} className="text-[6px] text-center text-muted/60">
                  {d}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-[2px]">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`blank-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
                const day = dayIdx + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const count = dayMap.get(dateStr);
                const trainingCount = trainingMap.get(dateStr);
                const hasTraining = trainingCount !== undefined && trainingCount > 0;
                const hasClimb = count !== undefined && count > 0;
                const isFuture = dateStr > todayStr;
                const isToday = dateStr === todayStr;
                const isRest = !isFuture && !hasClimb && !hasTraining && dateStr >= earliestDate && dateStr <= todayStr;

                let bg = EMPTY_COLOR;
                let border = "none";
                let backgroundImage: string | undefined;
                let backgroundSize: string | undefined;

                if (isToday) {
                  border = "2px solid var(--color-border)";
                }

                if (isFuture) {
                  bg = "rgba(128,128,128,0.08)";
                } else if (hasClimb) {
                  const grade = GRADES[count - 1];
                  if (grade) {
                    bg = colorMap[grade];
                    if (!isToday) {
                      border = "1px solid rgba(128,128,128,0.15)";
                    }
                  }
                } else if (hasTraining) {
                  bg = "rgba(74,74,82,0.12)";
                  backgroundImage = "radial-gradient(#4a4a52 1px, transparent 1.4px)";
                  backgroundSize = "5px 5px";
                  if (!isToday) {
                    border = "1px solid rgba(74,74,82,0.25)";
                  }
                }

                return (
                  <div
                    key={day}
                    className={`relative aspect-square rounded-[3px] flex items-center justify-center${!isFuture ? " cursor-pointer hover:ring-1 hover:ring-border/50" : ""}`}
                    style={{
                      backgroundColor: bg,
                      backgroundImage,
                      backgroundSize,
                      border,
                      boxSizing: "border-box",
                    }}
                    onClick={!isFuture ? () => navigate({ to: "/log", search: { date: dateStr } }) : undefined}
                  >
                    {isRest && <Moon size={8} weight="fill" className="opacity-20" />}
                    {hasTraining && (
                      <span
                        className="absolute font-display font-bold leading-none select-none"
                        style={{
                          top: 1,
                          right: 2,
                          fontSize: 8,
                          color: hasClimb
                            ? (lightTextGrades.has(GRADES[count - 1]) ? "white" : "var(--color-border)")
                            : "#4a4a52",
                        }}
                      >
                        {trainingCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
