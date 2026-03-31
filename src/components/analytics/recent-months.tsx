import { useNavigate } from "@tanstack/react-router";
import { Moon } from "@phosphor-icons/react";
import { GRADES, colorMap } from "../../lib/grades";

const EMPTY_COLOR = "var(--color-neutral-bg)";
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

interface HeatmapEntry {
  date: string;   // "YYYY-MM-DD"
  count: number;  // 1-based weighted average grade index
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function RecentMonths({ data }: { data: HeatmapEntry[] }) {
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
          <div key={`${year}-${month}`} className={`border border-border/30 rounded-md px-1.5 py-1${isCurrent ? " border-border/80" : ""}`}>
            <div className="text-[8px] uppercase tracking-wider opacity-50 text-center mb-1 font-bold">
              {MONTH_NAMES[month]}
            </div>
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 gap-[2px] mb-0.5">
              {DAY_HEADERS.map((d, i) => (
                <div key={i} className="text-[6px] text-center opacity-25">
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
                const isFuture = dateStr > todayStr;
                const isToday = dateStr === todayStr;
                const isRest = !isFuture && count === undefined && dateStr >= earliestDate && dateStr <= todayStr;

                let bg = EMPTY_COLOR;
                let border = "none";

                if (isToday) {
                  border = "2px solid var(--color-border)";
                }

                if (isFuture) {
                  bg = "rgba(128,128,128,0.08)";
                } else if (count !== undefined && count > 0) {
                  const grade = GRADES[count - 1];
                  if (grade) {
                    bg = colorMap[grade];
                    if (!isToday) {
                      border = "1px solid rgba(128,128,128,0.15)";
                    }
                  }
                }

                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-[3px] flex items-center justify-center${!isFuture ? " cursor-pointer hover:ring-1 hover:ring-border/50" : ""}`}
                    style={{
                      backgroundColor: bg,
                      border,
                      boxSizing: "border-box",
                    }}
                    onClick={!isFuture ? () => navigate({ to: "/log", search: { date: dateStr } }) : undefined}
                  >
                    {isRest && <Moon size={8} weight="fill" className="opacity-20" />}
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
