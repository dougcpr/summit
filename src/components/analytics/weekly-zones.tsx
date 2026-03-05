import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const colorVars: Record<string, string> = {
  accent: "var(--color-accent)",
  tertiary: "var(--color-tertiary)",
  secondary: "var(--color-secondary)",
  primary: "var(--color-primary)",
};

export function WeeklyZones({ goalGrade }: { goalGrade: string }) {
  const data = useQuery(api.analytics.weeklyZones, { goalGrade });

  if (!data) return null;

  return (
    <div className="border-2 border-border rounded-lg p-4 bg-card-bg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg">Weekly Zones</h3>
        <span className="text-sm px-2 py-1 border border-border rounded-full">
          Today: {data.todayZone}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {data.zones.map((zone) => {
          const sendPct = Math.min(100, (zone.sends / zone.target) * 100);
          const color = colorVars[zone.color] || "var(--color-border)";

          return (
            <div key={zone.label}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>
                  {zone.label}{" "}
                  <span className="opacity-50">({zone.grade})</span>
                </span>
                <span>
                  {zone.sends}/{zone.target}
                </span>
              </div>
              <div className="h-3 bg-neutral-bg rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${sendPct}%`, backgroundColor: color }}
                />
              </div>
              {zone.attemptTarget && (
                <div className="mt-1">
                  <div className="flex justify-end text-xs opacity-50">
                    attempts: {zone.attempts}/{zone.attemptTarget}
                  </div>
                  <div className="h-1.5 bg-neutral-bg rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all opacity-50"
                      style={{
                        width: `${Math.min(100, (zone.attempts / zone.attemptTarget) * 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
