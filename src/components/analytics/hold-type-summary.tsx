import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { colorMap } from "../../lib/grades";

export function HoldTypeSummary({ goalGrade }: { goalGrade: string }) {
  const data = useQuery(api.analytics.holdTypeBreakdown, { goalGrade });

  if (!data) return null;

  return (
    <div className="flex justify-around py-2">
      {data.types.map((t) => (
        <div key={t.type} className="text-center">
          <div className="text-[10px] uppercase tracking-wide opacity-50">
            {t.type}
          </div>
          <div
            className="text-xl font-bold font-display"
            style={{ color: t.gradeLevel === "—" ? "var(--color-border)" : colorMap[t.gradeLevel] || "var(--color-border)" }}
          >
            {t.gradeLevel}
          </div>
        </div>
      ))}
    </div>
  );
}
