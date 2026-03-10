import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const colorVars: Record<string, string> = {
  accent: "var(--color-accent)",
  tertiary: "var(--color-tertiary)",
  secondary: "var(--color-secondary)",
  primary: "var(--color-primary)",
};

export function WeeklyZones({ goalGrade }: { goalGrade: string }) {
  const data = useQuery(api.analytics.weeklyZones, { goalGrade });

  if (!data) return <div className="border-2 border-border rounded-lg p-2 bg-card-bg flex-1" />;

  return (
    <div className="border-2 border-border rounded-lg p-2 bg-card-bg flex-1">
      <span className="text-xs opacity-50 uppercase tracking-wide">Weekly Zones</span>
      <div className="flex flex-col gap-1 mt-1">
        {data.zones.map((zone) => {
          const color = colorVars[zone.color] || "var(--color-border)";
          const hasAttempts = zone.attemptTarget && zone.attemptTarget > 0;
          const total = hasAttempts ? zone.attemptTarget : zone.target;
          const sendPct = Math.min(100, (zone.sends / total) * 100);
          const attemptPct = hasAttempts ? Math.min(100, (zone.attempts / total) * 100) : 0;

          return (
            <div key={zone.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span>
                  {zone.label}{" "}
                  <span className="opacity-50 text-xs">{zone.grade}</span>
                </span>
                <span>
                  {zone.sends}/{zone.target}
                  {hasAttempts && (
                    <span className="opacity-50 text-xs ml-1">{zone.attempts}/{zone.attemptTarget}</span>
                  )}
                </span>
              </div>
              <div className="h-2 bg-neutral-bg rounded-full overflow-hidden relative">
                {attemptPct > 0 && (
                  <div
                    className="h-full rounded-full transition-all absolute opacity-40"
                    style={{ width: `${attemptPct}%`, backgroundColor: color }}
                  />
                )}
                <div
                  className="h-full rounded-full transition-all relative"
                  style={{ width: `${sendPct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
