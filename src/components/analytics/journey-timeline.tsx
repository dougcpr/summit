import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { colorMap } from "../../lib/grades";
import { Mountains, FlagCheckered, FirstAid, Heartbeat } from "@phosphor-icons/react";

interface JourneyTimelineProps {
  goalGrade: string;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
}

export function JourneyTimeline({ goalGrade }: JourneyTimelineProps) {
  const timeline = useQuery(api.analytics.timelineMilestones, { goalGrade });

  if (!timeline) return <div className="border-2 border-border rounded-lg p-2 bg-card-bg h-[5.5rem]" />;

  const { startDate, endDate, now, firstSends, gaps } = timeline;
  const totalSpan = endDate - startDate;
  const pct = (ts: number) => Math.max(0, Math.min(100, ((ts - startDate) / totalSpan) * 100));
  const progressPct = pct(now);

  return (
    <div className="border-2 border-border rounded-lg p-2 bg-card-bg">
      <span className="text-xs opacity-50 uppercase tracking-wide">Journey</span>

      {/* Timeline track */}
      <div className="relative w-full h-12 mt-1">
        {/* Bar track */}
        <div className="absolute bottom-0 left-0 right-0 h-5 bg-border/15 rounded-full" />

        {/* Grade milestones with lines to bar */}
        {firstSends.map((ms) => {
          const bg = colorMap[ms.grade] || "var(--color-border)";
          const textColor = ms.grade === "V4" ? "white" : "var(--color-border)";
          return (
            <div
              key={ms.grade}
              className="absolute flex flex-col items-center"
              style={{ left: `${pct(ms.date)}%`, top: 0, bottom: 0, transform: "translateX(-50%)" }}
            >
              <span
                className="text-[10px] font-display font-bold leading-none rounded-full px-1.5 py-0.5"
                style={{ backgroundColor: bg, color: textColor }}
              >
                {ms.grade}
              </span>
              <div className="w-[2px] flex-1 bg-border/40 mt-[1px]" />
            </div>
          );
        })}

        {/* Gap icons with lines to bar */}
        {gaps.map((gap, i) => (
          <div key={`gap-icons-${i}`}>
            <div
              className="absolute flex flex-col items-center"
              style={{ left: `${pct(gap.start)}%`, top: 0, bottom: 0, transform: "translateX(-50%)" }}
            >
              <FirstAid size={16} weight="fill" className="text-danger" />
              <div className="w-[2px] flex-1 bg-danger/40 mt-[1px]" />
            </div>
            <div
              className="absolute flex flex-col items-center"
              style={{ left: `${pct(gap.end)}%`, top: 0, bottom: 0, transform: "translateX(-50%)" }}
            >
              <Heartbeat size={16} weight="bold" className="text-tertiary" />
              <div className="w-[2px] flex-1 bg-tertiary/40 mt-[1px]" />
            </div>
          </div>
        ))}

        {/* Progress fill */}
        <div
          className="absolute bottom-0 left-0 h-5 rounded-full"
          style={{
            width: `${Math.max(1, progressPct)}%`,
            backgroundColor: "var(--color-tertiary)",
          }}
        />

        {/* Injury gaps */}
        {gaps.map((gap, i) => {
          const left = pct(gap.start);
          const width = pct(gap.end) - left;
          return (
            <div
              key={`gap-${i}`}
              className="absolute bottom-0 h-5 rounded-sm"
              style={{
                left: `${left}%`,
                width: `${Math.max(1, width)}%`,
                backgroundColor: "var(--color-danger)",
                opacity: 0.35,
              }}
            />
          );
        })}
      </div>

      {/* Start and end dates below the bar */}
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-1 opacity-60">
          <Mountains size={14} weight="fill" className="text-border" />
          <span className="text-[10px] font-display text-border">{formatDate(startDate)}</span>
        </div>
        <div className="flex items-center gap-1 opacity-60">
          <span className="text-[10px] font-display text-border">{formatDate(endDate)}</span>
          <FlagCheckered size={14} weight="fill" className="text-border" />
        </div>
      </div>
    </div>
  );
}
