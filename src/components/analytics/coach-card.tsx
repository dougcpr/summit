import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const dotColors: Record<string, string> = {
  fatigue: "var(--color-danger)",
  overreach: "var(--color-tertiary)",
  regression: "var(--color-tertiary)",
  push: "var(--color-primary)",
  solid: "var(--color-accent)",
  holds: "var(--color-secondary)",
};

export function CoachCard({ goalGrade }: { goalGrade: string }) {
  const data = useQuery(api.analytics.coachNudges, { goalGrade });

  if (!data) return <div className="p-2 h-[4.5rem]" />;

  return (
    <div className="p-2 flex flex-col gap-1.5">
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
