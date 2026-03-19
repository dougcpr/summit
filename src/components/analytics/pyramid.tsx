import { useQuery } from "convex/react";
import { HandGrabbing, Hand, HandPalm } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import { colorMap, fadedColorMap, borderColorMap } from "../../lib/grades";
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
  const holdData = useQuery(api.analytics.holdTypeBreakdown, { goalGrade });

  if (!data) return <div className="h-[9rem]" />;

  const totalClimbs = data.rows.reduce((sum, r) => sum + r.attempts, 0);

  // Map grade -> hold types at that level
  const holdsByGrade: Record<string, { type: HoldType; Icon: React.ElementType }[]> = {};
  if (holdData) {
    for (const t of holdData.types) {
      if (t.gradeLevel !== "—") {
        if (!holdsByGrade[t.gradeLevel]) holdsByGrade[t.gradeLevel] = [];
        holdsByGrade[t.gradeLevel].push({
          type: t.type as HoldType,
          Icon: holdIcons[t.type as HoldType],
        });
      }
    }
  }

  const activeRows = data.rows;
  const maxSends = Math.max(...activeRows.map((r) => r.sends), 1);

  return (
    <div className="px-2">
      <div className="flex justify-end">
        <span className="text-xs opacity-50 font-display">{totalClimbs} climbs</span>
      </div>
      <div className="flex flex-col gap-0.5">
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
                className="h-6 rounded-lg flex items-center justify-center font-display text-xs transition-all overflow-hidden relative mx-auto"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: isGoal ? "transparent" : fadedColor,
                  color: isGoal ? "var(--color-border)" : row.label === "V4" ? "white" : "var(--color-border)",
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
                    <Icon key={type} size={12} weight="bold" />
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
