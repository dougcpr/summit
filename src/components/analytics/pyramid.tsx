import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { colorMap } from "../../lib/grades";

interface PyramidProps {
  goalGrade: string;
  onGoalChange: (grade: string) => void;
}

export function Pyramid({ goalGrade }: PyramidProps) {
  const data = useQuery(api.analytics.pyramid, { goalGrade });

  if (!data) return null;

  const maxSends = Math.max(...data.rows.map((r) => r.sends), 1);

  return (
    <div className="border-2 border-border rounded-lg p-2 bg-card-bg">
      <div className="flex flex-col gap-1">
        {data.rows.map((row) => {
          const width = Math.max(10, Math.sqrt(row.sends / maxSends) * 100);
          const gradeColor = colorMap[row.label] || "var(--color-border)";
          const isGoal = row.sends === 0;
          return (
            <div key={row.label} className="flex items-center justify-center">
              <div
                className="h-8 rounded-lg flex items-center justify-center font-display text-sm transition-all"
                style={{
                  width: `${width}%`,
                  backgroundColor: isGoal ? "transparent" : gradeColor,
                  color: isGoal ? "var(--color-border)" : row.label === "V4" ? "white" : "var(--color-border)",
                  border: isGoal ? "2px dashed var(--color-border)" : "none",
                  minWidth: "4rem",
                }}
              >
                {row.label}: {row.sends}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
