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

  const maxTarget = Math.max(...data.rows.map((r) => r.target), 1);

  return (
    <div className="border-2 border-border rounded-lg p-2 bg-card-bg">
      <div className="flex flex-col gap-1">
        {data.rows.map((row) => {
          const barWidth = Math.max(10, Math.sqrt(row.target / maxTarget) * 100);
          const fillPct = Math.min(100, (row.sends / row.target) * 100);
          const gradeColor = colorMap[row.label] || "var(--color-border)";
          const fadedColor = fadedColorMap[row.label] || "var(--color-border)";
          const isGoal = row.label === goalGrade && row.sends === 0;
          return (
            <div key={row.label} className="flex items-center justify-center">
              <div
                className="h-8 rounded-lg flex items-center justify-center font-display text-sm transition-all overflow-hidden relative"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: isGoal ? "transparent" : fadedColor,
                  color: isGoal ? "var(--color-border)" : row.label === "V4" ? "white" : "var(--color-border)",
                  border: isGoal ? "2px dashed var(--color-border)" : `2px solid ${borderColorMap[row.label] || gradeColor}`,
                  minWidth: "5rem",
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
                  {row.label}: {row.sends}/{row.target}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
