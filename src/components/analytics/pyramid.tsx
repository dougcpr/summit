import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { colorMap, fadedColorMap, borderColorMap } from "../../lib/grades";

interface PyramidProps {
  goalGrade: string;
  onGoalChange: (grade: string) => void;
}

export function Pyramid({ goalGrade }: PyramidProps) {
  const data = useQuery(api.analytics.pyramid, { goalGrade });

  if (!data) return <div className="border-2 border-border rounded-lg p-2 bg-card-bg h-[11rem]" />;

  const totalClimbs = data.rows.reduce((sum, r) => sum + r.attempts, 0);

  const splitIdx = data.rows.findIndex((r) => r.sends >= 150);
  const minVisible = 2;
  const cutoff = splitIdx < 0 ? data.rows.length : Math.max(splitIdx, minVisible);
  const activeRows = data.rows.slice(0, cutoff);
  const completedRows = data.rows.slice(cutoff);

  const maxSends = Math.max(...activeRows.map((r) => r.sends), 1);

  return (
    <div className="border-2 border-border rounded-lg p-2 bg-card-bg">
      <div className="flex justify-end mb-1">
        <span className="text-xs opacity-50 font-display">{totalClimbs} climbs</span>
      </div>
      <div className="flex flex-col gap-1">
        {activeRows.map((row) => {
          const barWidth = 20 + (row.sends / maxSends) * 80;
          const fillPct = Math.min(100, (row.sends / row.target) * 100);
          const gradeColor = colorMap[row.label] || "var(--color-border)";
          const fadedColor = fadedColorMap[row.label] || "var(--color-border)";
          const isGoal = row.label === goalGrade && row.sends === 0;
          return (
            <div key={row.label}>
              <div
                className="h-6 rounded-lg flex items-center justify-center font-display text-sm transition-all overflow-hidden relative mx-auto"
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
                <span className="relative z-10">
                  {row.label}: {row.sends}
                </span>
              </div>
            </div>
          );
        })}

        {completedRows.length > 0 && (
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 mt-1 opacity-50">
            {completedRows.map((row) => (
              <span key={row.label} className="font-display text-xs flex items-center gap-1">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: colorMap[row.label] || "var(--color-border)" }}
                />
                {row.label}: {row.sends}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
