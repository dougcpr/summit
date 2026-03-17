import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const dotColors: Record<string, string> = {
  fatigue: "var(--color-secondary)",
  overreach: "var(--color-tertiary)",
  regression: "var(--color-tertiary)",
  push: "var(--color-accent)",
  solid: "var(--color-primary)",
  holds: "var(--color-secondary)",
};

export function CoachCard({ goalGrade }: { goalGrade: string }) {
  const data = useQuery(api.analytics.coachNudges, { goalGrade });

  if (!data) return <div className="border-2 border-border rounded-lg p-2 bg-card-bg h-[4.5rem]" />;

  return (
    <div className="border-2 border-border rounded-lg p-2 bg-card-bg flex flex-col gap-1.5">
      <span className="text-xs opacity-50 uppercase tracking-wide">Coach</span>
      {data.nudges.map((nudge, i) => (
        <div key={i} className="flex items-start gap-2">
          <span
            className="mt-1.5 w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: dotColors[nudge.type] }}
          />
          <span className="text-sm leading-snug">{nudge.message}</span>
        </div>
      ))}
    </div>
  );
}
