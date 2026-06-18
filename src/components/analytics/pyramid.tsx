import { useQuery } from "convex/react";
import { HandGrabbing, Hand, HandPalm } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import { colorMap, fadedColorMap, borderColorMap, gradeTextColor } from "../../lib/grades";
import type { HoldType } from "../../lib/grades";

const holdIcons: Record<HoldType, React.ElementType> = {
  jug: HandGrabbing,
  crimp: Hand,
  sloper: HandPalm,
};

interface PyramidProps {
  goalGrade: string;
}

export function Pyramid({ goalGrade }: PyramidProps) {
  const data = useQuery(api.analytics.pyramid, { goalGrade });
  const timelineData = useQuery(api.analytics.holdTypeTimelines, { goalGrade });

  if (!data) return <div className="h-[9rem]" />;

  const totalClimbs = data.rows.reduce((sum, r) => sum + r.attempts, 0);

  // Map grade -> hold types using the same data source as the hold-type timeline
  const holdsByGrade: Record<string, { type: HoldType; Icon: React.ElementType }[]> = {};
  if (timelineData) {
    for (const tl of timelineData.timelines) {
      // Use highest milestone grade for each hold type
      const maxMilestone = tl.milestones.reduce<{ grade: string; gi: number } | null>((best, ms) => {
        const gi = parseInt(ms.grade.replace("V", ""), 10);
        return !best || gi > best.gi ? { grade: ms.grade, gi } : best;
      }, null);
      if (maxMilestone) {
        if (!holdsByGrade[maxMilestone.grade]) holdsByGrade[maxMilestone.grade] = [];
        holdsByGrade[maxMilestone.grade].push({
          type: tl.holdType as HoldType,
          Icon: holdIcons[tl.holdType as HoldType],
        });
      }
    }
  }

  const activeRows = data.rows;
  const maxSends = Math.max(...activeRows.map((r) => r.sends), 1);

  return (
    <div className="px-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted">Where I Am</span>
        <span className="text-xs text-muted font-display">{totalClimbs} climbs</span>
      </div>
      <div className="flex flex-col gap-1">
        {activeRows.map((row) => {
          const barWidth = 20 + (row.sends / maxSends) * 80;
          const fillPct = Math.min(100, (row.sends / row.target) * 100);
          const gradeColor = colorMap[row.label] || "var(--color-border)";
          const fadedColor = fadedColorMap[row.label] || "var(--color-border)";
          const isGoal = row.label === goalGrade && row.sends === 0;
          const holds = holdsByGrade[row.label] || [];
          return (
            <div key={row.label}>
              <div
                className="h-[clamp(2rem,4.1vh,2.375rem)] rounded-lg flex items-center justify-center font-display text-sm transition-all overflow-hidden relative mx-auto"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: isGoal ? "transparent" : fadedColor,
                  color: isGoal ? "var(--color-border)" : gradeTextColor(row.label),
                  border: isGoal ? "2px dashed var(--color-border)" : `2px solid ${borderColorMap[row.label] || gradeColor}`,
                  minWidth: "3rem",
                }}
              >
                {!isGoal && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-l-md transition-all"
                    style={{
                      width: `${fillPct}%`,
                      backgroundColor: gradeColor,
                    }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1">
                  {row.label}: {row.sends}
                  {holds.map(({ type, Icon }) => (
                    <Icon key={type} size={14} weight="bold" />
                  ))}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
