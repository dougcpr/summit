import { useState } from "react";
import { CaretLeft, CaretRight, Moon } from "@phosphor-icons/react";
import { GRADES, colorMap } from "../../lib/grades";

// Uses CSS variable so it responds to dark mode
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

export function YearCalendar({ data, goalDate }: { data: HeatmapEntry[]; goalDate?: string | null }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const todayStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Determine earliest date/year from data
  const sortedDates = data.map((d) => d.date).sort();
  const earliestDate = sortedDates.length > 0 ? sortedDates[0] : todayStr;
  const earliestYear = sortedDates.length > 0 ? parseInt(earliestDate.substring(0, 4), 10) : currentYear;

  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Build lookup map for selected year
  const dayMap = new Map<string, number>();
  for (const entry of data) {
    if (entry.date.startsWith(String(selectedYear))) {
      dayMap.set(entry.date, entry.count);
    }
  }

  const canGoBack = selectedYear > earliestYear;
  const canGoForward = selectedYear < currentYear;

  return (
    <div>
      {/* Year navigation */}
      <div className="flex items-center justify-center gap-3 mb-1">
        <button
          onClick={() => canGoBack && setSelectedYear((y) => y - 1)}
          className={`p-1 ${canGoBack ? "opacity-50 hover:opacity-100" : "opacity-15 cursor-default"}`}
          disabled={!canGoBack}
        >
          <CaretLeft size={14} weight="bold" />
        </button>
        <span className="text-xs font-display tracking-widest opacity-70">
          {selectedYear}
        </span>
        <button
          onClick={() => canGoForward && setSelectedYear((y) => y + 1)}
          className={`p-1 ${canGoForward ? "opacity-50 hover:opacity-100" : "opacity-15 cursor-default"}`}
          disabled={!canGoForward}
        >
          <CaretRight size={14} weight="bold" />
        </button>
      </div>

      {/* 3x4 month grid */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-2">
        {MONTH_NAMES.map((monthName, monthIdx) => {
          const daysInMonth = getDaysInMonth(selectedYear, monthIdx);
          const firstDay = getFirstDayOfMonth(selectedYear, monthIdx);

          return (
            <div key={monthName} className="border border-border/10 rounded-md p-1">
              <div className="text-[6px] uppercase tracking-wider opacity-50 text-center mb-0.5 font-bold">
                {monthName}
              </div>
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 gap-[1px] mb-px">
                {DAY_HEADERS.map((d, i) => (
                  <div key={i} className="text-[4px] text-center opacity-25">
                    {d}
                  </div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-[2px]">
                {/* Blank offset cells */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`blank-${i}`} className="aspect-square" />
                ))}
                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
                  const day = dayIdx + 1;
                  const dateStr = `${selectedYear}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const count = dayMap.get(dateStr);
                  const isFuture = dateStr > todayStr;
                  const isGoalDate = goalDate === dateStr;
                  const isToday = dateStr === todayStr;

                  let bg = EMPTY_COLOR;
                  let border = "none";
                  let boxShadow: string | undefined;

                  if (isToday) {
                    border = "2px solid var(--color-border)";
                  }

                  const isRest = !isFuture && count === undefined && dateStr >= earliestDate && dateStr <= todayStr;

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

                  // Checkered flag pattern for goal date
                  let backgroundImage: string | undefined;
                  if (isGoalDate) {
                    backgroundImage = `
                      repeating-conic-gradient(
                        #3b3b3b 0% 25%,
                        #f5f0e1 0% 50%
                      )`;
                    bg = "transparent";
                    border = "none";
                    boxShadow = "inset 0 0 0 1px rgba(202, 164, 43, 0.9)";
                  }

                  return (
                    <div
                      key={day}
                      className="aspect-square rounded-[2px] flex items-center justify-center"
                      style={{
                        backgroundColor: bg,
                        backgroundImage,
                        backgroundSize: isGoalDate ? "4px 4px" : undefined,
                        border,
                        boxShadow,
                        boxSizing: "border-box",
                      }}
                    >
                      {isRest && <Moon size={6} weight="fill" className="opacity-20" />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
