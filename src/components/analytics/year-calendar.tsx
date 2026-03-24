import { useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { GRADES, colorMap } from "../../lib/grades";

const EMPTY_COLOR = "#f6f1e3";
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

  // Determine earliest year from data
  const years = data.map((d) => parseInt(d.date.substring(0, 4), 10));
  const earliestYear = years.length > 0 ? Math.min(...years) : currentYear;

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
      <div className="grid grid-cols-3 gap-x-1 gap-y-0.5">
        {MONTH_NAMES.map((monthName, monthIdx) => {
          const daysInMonth = getDaysInMonth(selectedYear, monthIdx);
          const firstDay = getFirstDayOfMonth(selectedYear, monthIdx);

          return (
            <div key={monthName}>
              <div className="text-[6px] uppercase tracking-wider opacity-40 text-center mb-0.5">
                {monthName}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-[1px]">
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

                  let bg = EMPTY_COLOR;
                  let border = "none";

                  if (isGoalDate) {
                    border = "2px solid rgba(202, 164, 43, 0.9)";
                  }

                  if (isFuture) {
                    bg = "rgba(59,59,59,0.04)";
                  } else if (count !== undefined && count > 0) {
                    const grade = GRADES[count - 1];
                    if (grade) {
                      bg = colorMap[grade];
                      if (!isGoalDate) {
                        border = "1px solid rgba(59,59,59,0.1)";
                      }
                    }
                  }

                  return (
                    <div
                      key={day}
                      className="aspect-square rounded-[2px]"
                      style={{
                        backgroundColor: bg,
                        border,
                        boxSizing: "border-box",
                      }}
                    />
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
