import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CaretLeft, CaretRight, Moon, Trophy, Barbell, LadderSimple } from "@phosphor-icons/react";
import { GRADES, colorMap, COMPETITION_DATES } from "../../lib/grades";

// Uses CSS variable so it responds to dark mode
const EMPTY_COLOR = "var(--color-neutral-bg)";
const SINGLE_CLIMB_COLOR = "rgba(49, 95, 141, 0.8)";
const TRAINING_ICON = "#1e3a8a"; // tailwind blue-900 — navy for training icons
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

interface TrainingEntry {
  date: string;  // "YYYY-MM-DD"
  count: number;
  hasFingerboard: boolean;
  hasStrength: boolean;
}

export function YearCalendar({
  data,
  trainingData = [],
  goalDate,
  singleColor = false,
}: {
  data: HeatmapEntry[];
  trainingData?: TrainingEntry[];
  goalDate?: string | null;
  singleColor?: boolean;
}) {
  const navigate = useNavigate();
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

  const trainingMap = new Map<string, { hasFingerboard: boolean; hasStrength: boolean }>();
  for (const entry of trainingData) {
    if (entry.date.startsWith(String(selectedYear))) {
      trainingMap.set(entry.date, {
        hasFingerboard: entry.hasFingerboard,
        hasStrength: entry.hasStrength,
      });
    }
  }

  const compDates = new Set(COMPETITION_DATES.map((c) => c.date));

  const canGoBack = selectedYear > earliestYear;
  const canGoForward = selectedYear < currentYear;

  return (
    <div>
      {/* Year navigation */}
      <div className="flex items-center justify-center gap-4 mb-1">
        <button
          onClick={() => canGoBack && setSelectedYear((y) => y - 1)}
          className={`p-2 -m-1 ${canGoBack ? "opacity-50 hover:opacity-100" : "opacity-15 cursor-default"}`}
          disabled={!canGoBack}
        >
          <CaretLeft size={20} weight="bold" />
        </button>
        <span className="text-xs font-display tracking-widest text-muted border border-border/20 rounded-full px-3 py-0.5">
          {selectedYear}
        </span>
        <button
          onClick={() => canGoForward && setSelectedYear((y) => y + 1)}
          className={`p-2 -m-1 ${canGoForward ? "opacity-50 hover:opacity-100" : "opacity-15 cursor-default"}`}
          disabled={!canGoForward}
        >
          <CaretRight size={20} weight="bold" />
        </button>
      </div>

      {/* 3x4 month grid */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        {MONTH_NAMES.map((monthName, monthIdx) => {
          // Hide months before the earliest recorded date
          const monthEnd = `${selectedYear}-${String(monthIdx + 1).padStart(2, "0")}-${String(getDaysInMonth(selectedYear, monthIdx)).padStart(2, "0")}`;
          if (monthEnd < earliestDate) return null;

          const daysInMonth = getDaysInMonth(selectedYear, monthIdx);
          const firstDay = getFirstDayOfMonth(selectedYear, monthIdx);
          const isCurrentMonth = selectedYear === currentYear && monthIdx === now.getMonth();

          return (
            <div key={monthName} className={`border border-border/15 rounded-md px-1 py-0.5${isCurrentMonth ? " border-border/40" : ""}`}>
              <div className="text-[6px] uppercase tracking-wider text-muted text-center mb-0.5 font-bold">
                {monthName}
              </div>
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 gap-[1px] mb-px">
                {DAY_HEADERS.map((d, i) => (
                  <div key={i} className="text-[4px] text-center text-muted/60">
                    {d}
                  </div>
                ))}
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
                  const isCompDate = compDates.has(dateStr);
                  const isToday = dateStr === todayStr;
                  const trainingInfo = trainingMap.get(dateStr);
                  const hasTraining = trainingInfo !== undefined;
                  const hasFingerboard = trainingInfo?.hasFingerboard ?? false;
                  const hasStrength = trainingInfo?.hasStrength ?? false;
                  const hasClimb = count !== undefined && count > 0;

                  let bg = EMPTY_COLOR;
                  let border = "none";
                  let boxShadow: string | undefined;

                  if (isToday) {
                    border = "2px solid var(--color-border)";
                  }

                  const isRest = !isFuture && !hasClimb && !hasTraining && dateStr >= earliestDate && dateStr <= todayStr;

                  if (isFuture) {
                    bg = "rgba(128,128,128,0.08)";
                  } else if (hasClimb) {
                    const grade = GRADES[count - 1];
                    if (grade) {
                      bg = singleColor ? SINGLE_CLIMB_COLOR : colorMap[grade];
                      if (!isToday) {
                        border = "1px solid rgba(128,128,128,0.15)";
                      }
                    }
                  }
                  // Training without a climb produces no fill or border —
                  // the icon block below renders the training indicator.

                  let backgroundImage: string | undefined;
                  let backgroundSize: string | undefined;

                  // Checkered flag pattern for goal date
                  if (isGoalDate) {
                    backgroundImage = `
                      repeating-conic-gradient(
                        var(--color-border) 0% 25%,
                        var(--color-neutral-bg) 0% 50%
                      )`;
                    backgroundSize = "4px 4px";
                    bg = "transparent";
                    border = "none";
                    boxShadow = "inset 0 0 0 1px rgba(202, 164, 43, 0.9)";
                  }

                  // Competition date styling
                  if (isCompDate && !isGoalDate) {
                    bg = "rgba(228, 196, 77, 0.25)";
                    if (!isToday) {
                      border = "1px solid rgba(202, 164, 43, 0.6)";
                    }
                  }

                  return (
                    <div
                      key={day}
                      className={`relative aspect-square rounded-[2px] flex items-center justify-center${!isFuture ? " cursor-pointer hover:ring-1 hover:ring-border/50" : ""}`}
                      style={{
                        backgroundColor: bg,
                        backgroundImage,
                        backgroundSize,
                        border,
                        boxShadow,
                        boxSizing: "border-box",
                      }}
                      onClick={!isFuture ? () => navigate({ to: "/log", search: { date: dateStr } }) : undefined}
                    >
                      {isCompDate && !isGoalDate && <Trophy size={6} weight="fill" className="opacity-60" style={{ color: "rgba(202, 164, 43, 1)" }} />}
                      {isRest && !isCompDate && <Moon size={6} weight="fill" className="opacity-20" />}
                      {hasTraining && !hasClimb && !isCompDate && !isGoalDate && !isFuture && (
                        hasFingerboard && hasStrength ? (
                          <span className="flex items-center gap-px opacity-50" style={{ color: TRAINING_ICON }}>
                            <LadderSimple size={4} weight="fill" />
                            <span className="text-[5px] font-bold leading-none">/</span>
                            <Barbell size={4} weight="fill" />
                          </span>
                        ) : hasFingerboard ? (
                          <LadderSimple size={6} weight="fill" className="opacity-50" style={{ color: TRAINING_ICON }} />
                        ) : (
                          <Barbell size={6} weight="fill" className="opacity-50" style={{ color: TRAINING_ICON }} />
                        )
                      )}
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
