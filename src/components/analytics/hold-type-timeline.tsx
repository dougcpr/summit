import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { HandGrabbing, Hand, HandPalm } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import { colorMap, borderColorMap, gradeIndex, holdTypeConfig } from "../../lib/grades";
import type { HoldType } from "../../lib/grades";

const holdIcons: Record<HoldType, React.ElementType> = {
  jug: HandGrabbing,
  crimp: Hand,
  sloper: HandPalm,
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const HOLD_TYPES: HoldType[] = ["jug", "crimp", "sloper"];
const MARKER_RADIUS_PX = 6;

type Timeline = {
  holdType: string;
  milestones: { grade: string; date: number }[];
};

type MonthlyFocus = {
  monthStart: number;
  holdType: string;
  grade: string | null;
  count: number;
  hasNewGrade: boolean;
};

type YearWindow = {
  index: number;
  start: number;
  end: number;
  label: string;
};

type HoldTypeTimelineData = {
  startDate: number;
  now: number;
  timelines: Timeline[];
  monthlyFocus?: MonthlyFocus[];
};

type Climb = {
  grade: string;
  completed: boolean;
  holdType: string;
  climbedAt: number;
};

interface HoldTypeTimelineProps {
  goalGrade: string;
}

function addYears(ts: number, years: number) {
  const date = new Date(ts);
  date.setFullYear(date.getFullYear() + years);
  return date.getTime();
}

function formatYearLabel(index: number, start: number, end: number) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startMonth = MONTHS[startDate.getMonth()];
  const endMonth = MONTHS[endDate.getMonth()];
  const range =
    startDate.getFullYear() === endDate.getFullYear()
      ? `${startDate.getFullYear()}`
      : `${startMonth} ${startDate.getFullYear()}-${endMonth} ${endDate.getFullYear()}`;
  return `Year ${index + 1}: ${range}`;
}

function buildMonthTicks(rangeStart: number, rangeEnd: number, pct: (ts: number) => number) {
  const ticks: { label: string; pct: number; key: string; edge?: "start" | "end" }[] = [
    { label: MONTHS[new Date(rangeStart).getMonth()], pct: 0, key: `${rangeStart}-start`, edge: "start" },
  ];
  const cur = new Date(rangeStart);
  cur.setDate(1);
  cur.setHours(0, 0, 0, 0);
  cur.setMonth(cur.getMonth() + 1);

  while (cur.getTime() < rangeEnd) {
    const p = pct(cur.getTime());
    if (p > 2 && p < 98) {
      ticks.push({ label: MONTHS[cur.getMonth()], pct: p, key: `${cur.getTime()}` });
    }
    cur.setMonth(cur.getMonth() + 1);
  }

  ticks.push({ label: MONTHS[new Date(rangeEnd).getMonth()], pct: 100, key: `${rangeEnd}-end`, edge: "end" });
  return ticks;
}

function markerLeft(pct: number) {
  return `clamp(${MARKER_RADIUS_PX}px, ${pct}%, calc(100% - ${MARKER_RADIUS_PX}px))`;
}

function computeMonthlyFocus(climbs: Climb[], timelines: Timeline[], goalGrade: string) {
  const goalIdx = gradeIndex(goalGrade);
  const milestonesByHoldMonth = new Set<string>();
  for (const tl of timelines) {
    for (const ms of tl.milestones) {
      const d = new Date(ms.date);
      milestonesByHoldMonth.add(`${tl.holdType}:${d.getFullYear()}-${d.getMonth()}`);
    }
  }

  const monthly: Record<string, {
    monthStart: number;
    holds: Record<HoldType, { count: number; highestCompletedGrade: string | null; highestCompletedIdx: number }>;
  }> = {};

  for (const climb of climbs) {
    const holdType = climb.holdType.toLowerCase() as HoldType;
    if (!HOLD_TYPES.includes(holdType)) continue;

    const d = new Date(climb.climbedAt);
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
    const month = monthly[monthKey] ?? {
      monthStart: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
      holds: {
        jug: { count: 0, highestCompletedGrade: null, highestCompletedIdx: -1 },
        crimp: { count: 0, highestCompletedGrade: null, highestCompletedIdx: -1 },
        sloper: { count: 0, highestCompletedGrade: null, highestCompletedIdx: -1 },
      },
    };

    const hold = month.holds[holdType];
    hold.count++;
    const climbGradeIdx = gradeIndex(climb.grade);
    if (climb.completed && climbGradeIdx > hold.highestCompletedIdx && climbGradeIdx <= goalIdx) {
      hold.highestCompletedGrade = climb.grade;
      hold.highestCompletedIdx = climbGradeIdx;
    }
    monthly[monthKey] = month;
  }

  return Object.entries(monthly)
    .map(([monthKey, month]) => {
      const [holdType, info] = Object.entries(month.holds).reduce((best, current) => {
        if (current[1].count !== best[1].count) return current[1].count > best[1].count ? current : best;
        return current[1].highestCompletedIdx > best[1].highestCompletedIdx ? current : best;
      });
      if (info.count === 0) return null;
      return {
        monthStart: month.monthStart,
        holdType,
        grade: info.highestCompletedGrade,
        count: info.count,
        hasNewGrade: milestonesByHoldMonth.has(`${holdType}:${monthKey}`),
      };
    })
    .filter((focus): focus is MonthlyFocus => focus !== null)
    .sort((a, b) => a.monthStart - b.monthStart);
}

function TimelinePanel({
  timelines,
  monthlyFocus,
  yearIndex,
  rangeStart,
  rangeEnd,
}: {
  timelines: Timeline[];
  monthlyFocus: MonthlyFocus[];
  yearIndex: number;
  rangeStart: number;
  rangeEnd: number;
}) {
  const span = Math.max(1, rangeEnd - rangeStart);
  const pct = (ts: number) => Math.max(0, Math.min(100, ((ts - rangeStart) / span) * 100));
  const monthTicks = buildMonthTicks(rangeStart, rangeEnd, pct);
  const showMilestones = yearIndex === 0;
  const focusItems = monthlyFocus.filter((focus) => {
    const monthEnd = new Date(focus.monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    return monthEnd.getTime() > rangeStart && focus.monthStart < rangeEnd;
  });

  return (
    <div className="relative overflow-hidden">
      {/* Month grid lines - clipped to this container */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {monthTicks.map((tick) => (
          <div
            key={"line-" + tick.key}
            className="absolute top-0 bottom-0 w-px bg-border/20"
            style={{ left: `${tick.pct}%` }}
          />
        ))}
      </div>

      {/* Month labels */}
      <div className="relative h-4">
        {monthTicks.map((tick) => (
          <span
            key={tick.key}
            className="absolute text-[10px] text-muted font-display"
            style={{
              left: `${tick.pct}%`,
              transform: tick.edge === "start" ? "translateX(0)" : tick.edge === "end" ? "translateX(-100%)" : "translateX(-50%)",
            }}
          >
            {tick.label}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-[clamp(0.375rem,0.9vh,0.5rem)]">
        {timelines.map((tl) => {
          const milestones = tl.milestones.filter((ms) => ms.date >= rangeStart && ms.date <= rangeEnd);
          const rowFocusItems = focusItems.filter((focus) => focus.holdType === tl.holdType);

          return (
            <div key={tl.holdType} className="relative h-[clamp(1.25rem,2.7vh,1.5rem)]">
              {/* Grade milestones */}
              {showMilestones && milestones.map((ms) => {
                  const bg = colorMap[ms.grade] || "var(--color-border)";
                  const borderBg = borderColorMap[ms.grade] || "var(--color-border)";
                  return (
                    <div
                      key={`${ms.grade}-${ms.date}`}
                      className="absolute"
                      style={{ left: markerLeft(pct(ms.date)), top: "50%", transform: "translate(-50%, -50%)" }}
                      title={`${holdTypeConfig[tl.holdType as HoldType]?.label ?? tl.holdType}: ${ms.grade}`}
                    >
                      <span
                        className="block h-3 w-3 rounded-full border"
                        style={{ backgroundColor: bg, borderColor: borderBg }}
                        aria-label={`${holdTypeConfig[tl.holdType as HoldType]?.label ?? tl.holdType}: ${ms.grade}`}
                      />
                    </div>
                  );
              })}
              {!showMilestones && rowFocusItems.map((focus) => {
                  const monthEnd = new Date(focus.monthStart);
                  monthEnd.setMonth(monthEnd.getMonth() + 1);
                  const markerDate = focus.monthStart + (monthEnd.getTime() - focus.monthStart) / 2;
                  const bg = focus.grade ? colorMap[focus.grade] || "var(--color-border)" : "rgba(74, 64, 51, 0.12)";
                  const borderBg = focus.hasNewGrade ? "#e4c44d" : focus.grade ? borderColorMap[focus.grade] || "var(--color-border)" : "rgba(74, 64, 51, 0.25)";

                  return (
                    <div
                      key={`${focus.holdType}-${focus.monthStart}`}
                      className="absolute"
                      style={{ left: markerLeft(pct(markerDate)), top: "50%", transform: "translate(-50%, -50%)" }}
                    >
                      <span
                        className="block h-3 w-3 rounded-full border-2"
                        style={{ backgroundColor: bg, borderColor: borderBg }}
                        title={`${holdTypeConfig[focus.holdType as HoldType]?.label ?? focus.holdType}: ${focus.count} climbs${focus.grade ? `, ${focus.grade}` : ""}`}
                        aria-label={`${holdTypeConfig[focus.holdType as HoldType]?.label ?? focus.holdType}: ${focus.count} climbs${focus.grade ? `, ${focus.grade}` : ""}`}
                      />
                    </div>
                  );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HoldTypeTimeline({ goalGrade }: HoldTypeTimelineProps) {
  const data = useQuery(api.analytics.holdTypeTimelines, { goalGrade });
  const climbs = useQuery(api.climbs.getAll);

  if (!data) return <div className="h-[6rem]" />;

  return <HoldTypeTimelineContent climbs={climbs ?? []} data={data} goalGrade={goalGrade} />;
}

function HoldTypeTimelineContent({ climbs, data, goalGrade }: { climbs: Climb[]; data: HoldTypeTimelineData; goalGrade: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeYear, setActiveYear] = useState(0);

  const { startDate, now, timelines } = data;

  const allDates = timelines.flatMap((tl) => tl.milestones.map((m) => m.date));
  const climbDates = climbs.map((climb) => climb.climbedAt);
  const latestDate = Math.max(now, ...allDates, ...climbDates);
  const monthlyFocus = useMemo(
    () => computeMonthlyFocus(climbs, timelines, goalGrade),
    [climbs, timelines, goalGrade],
  );

  const yearWindows = useMemo<YearWindow[]>(() => {
    const yearCount = Math.max(1, Math.ceil((latestDate - startDate) / YEAR_MS));
    return Array.from({ length: yearCount }, (_, index) => {
      const start = addYears(startDate, index);
      const end = addYears(startDate, index + 1);
      return {
        index,
        start,
        end,
        label: formatYearLabel(index, start, end),
      };
    });
  }, [latestDate, startDate]);

  useEffect(() => {
    const latestYear = yearWindows.length - 1;
    setActiveYear(latestYear);
    requestAnimationFrame(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      scroller.scrollTo({ left: scroller.clientWidth * latestYear });
    });
  }, [yearWindows.length]);

  const scrollToYear = (index: number) => {
    setActiveYear(index);
    scrollerRef.current?.scrollTo({ left: scrollerRef.current.clientWidth * index, behavior: "smooth" });
  };

  const handleScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const nextYear = Math.round(scroller.scrollLeft / Math.max(1, scroller.clientWidth));
    setActiveYear(Math.max(0, Math.min(yearWindows.length - 1, nextYear)));
  };

  if (allDates.length === 0 && monthlyFocus.length === 0) return <div className="h-[6rem]" />;

  return (
    <div className="px-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] text-muted font-display">{yearWindows[activeYear]?.label}</span>
        <div className="flex items-center gap-1.5">
          {yearWindows.length > 1 && yearWindows.map((year) => (
            <button
              key={year.index}
              type="button"
              className="h-2 w-2 rounded-full transition-colors"
              style={{ backgroundColor: year.index === activeYear ? "var(--color-border)" : "rgba(74, 64, 51, 0.25)" }}
              aria-label={`Show year ${year.index + 1}`}
              aria-current={year.index === activeYear ? "true" : undefined}
              onClick={() => scrollToYear(year.index)}
            />
          ))}
          <span className="text-[11px] text-muted font-display">
            {activeYear + 1}/{yearWindows.length}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="w-20 shrink-0 pt-4">
          <div className="flex flex-col gap-[clamp(0.375rem,0.9vh,0.5rem)]">
            {timelines.map((tl) => {
              const Icon = holdIcons[tl.holdType as HoldType];
              return (
                <div
                  key={tl.holdType}
                  className="flex h-[clamp(1.25rem,2.7vh,1.5rem)] items-center gap-1.5 rounded-md px-2"
                  style={{ backgroundColor: holdTypeConfig[tl.holdType as HoldType]?.bgColor }}
                >
                  {Icon && <Icon size={14} weight="bold" />}
                  <span className="text-[11px] capitalize">{tl.holdType}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="min-w-0 flex-1 overflow-x-auto snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={handleScroll}
        >
          <div className="flex">
            {yearWindows.map((year) => (
              <div key={year.index} className="min-w-full snap-center">
                <TimelinePanel
                  timelines={timelines}
                  monthlyFocus={monthlyFocus}
                  yearIndex={year.index}
                  rangeStart={year.start}
                  rangeEnd={year.end}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
