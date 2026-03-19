import { useQuery } from "convex/react";
import { HandGrabbing, Hand, HandPalm } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import { colorMap, borderColorMap, holdTypeConfig } from "../../lib/grades";
import type { HoldType } from "../../lib/grades";

const holdIcons: Record<HoldType, React.ElementType> = {
  jug: HandGrabbing,
  crimp: Hand,
  sloper: HandPalm,
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface HoldTypeTimelineProps {
  goalGrade: string;
}

export function HoldTypeTimeline({ goalGrade }: HoldTypeTimelineProps) {
  const data = useQuery(api.analytics.holdTypeTimelines, { goalGrade });

  if (!data) return <div className="h-[6rem]" />;

  const { startDate, now, timelines } = data;

  // Shared time range: earliest milestone across all hold types → now
  const allDates = timelines.flatMap((tl) => tl.milestones.map((m) => m.date));
  if (allDates.length === 0) return <div className="h-[6rem]" />;

  const rangeStart = Math.min(startDate, ...allDates);
  const rangeEnd = now;
  const span = rangeEnd - rangeStart;
  const pct = (ts: number) => Math.max(0, Math.min(100, ((ts - rangeStart) / span) * 100));

  // Generate month ticks
  const monthTicks: { label: string; pct: number }[] = [];
  const startD = new Date(rangeStart);
  const endD = new Date(rangeEnd);
  const cur = new Date(startD.getFullYear(), startD.getMonth() + 1, 1);
  while (cur <= endD) {
    const p = pct(cur.getTime());
    if (p > 2 && p < 98) {
      monthTicks.push({ label: MONTHS[cur.getMonth()], pct: p });
    }
    cur.setMonth(cur.getMonth() + 1);
  }

  return (
    <div className="px-2 pb-1">
      <div className="relative">
        {/* Month grid lines - clipped to this container */}
        <div className="absolute inset-0 ml-16 overflow-hidden pointer-events-none">
          {monthTicks.map((tick) => (
            <div
              key={"line-" + tick.label + tick.pct}
              className="absolute top-0 bottom-0 w-px bg-border/20"
              style={{ left: `${tick.pct}%` }}
            />
          ))}
        </div>

        {/* Month labels */}
        <div className="relative h-4 ml-16">
          {monthTicks.map((tick) => (
            <span
              key={tick.label + tick.pct}
              className="absolute text-[9px] opacity-40 font-display"
              style={{ left: `${tick.pct}%`, transform: "translateX(calc(-100% - 3px))" }}
            >
              {tick.label}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
        {timelines.map((tl) => {
          const Icon = holdIcons[tl.holdType as HoldType];
          const hasMilestones = tl.milestones.length > 0;
          const lastDate = hasMilestones ? Math.max(...tl.milestones.map((m) => m.date)) : 0;

          return (
            <div key={tl.holdType} className="flex items-center gap-2">
              <div
                className="flex items-center gap-1 w-16 rounded-md px-1.5 py-0.5"
                style={{ backgroundColor: holdTypeConfig[tl.holdType as HoldType]?.bgColor }}
              >
                {Icon && <Icon size={14} weight="bold" />}
                <span className="text-[10px] capitalize">{tl.holdType}</span>
              </div>
              <div className="relative flex-1" style={{ height: "18px" }}>
                {/* Grade milestones */}
                {tl.milestones.map((ms) => {
                  const bg = colorMap[ms.grade] || "var(--color-border)";
                  const borderBg = borderColorMap[ms.grade] || "var(--color-border)";
                  const textColor = ms.grade === "V4" ? "white" : "var(--color-border)";
                  return (
                    <div
                      key={ms.grade}
                      className="absolute"
                      style={{ left: `${pct(ms.date)}%`, top: "50%", transform: "translate(-50%, -55%)" }}
                    >
                      <span
                        className="text-[8px] font-display font-bold leading-none rounded-full px-1 py-0.5 border"
                        style={{ backgroundColor: bg, color: textColor, borderColor: borderBg }}
                      >
                        {ms.grade}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
