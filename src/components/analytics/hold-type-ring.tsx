import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { holdTypeConfig } from "../../lib/grades";
import type { HoldType } from "../../lib/grades";

export function HoldTypeRing() {
  const data = useQuery(api.analytics.holdTypeBreakdown);

  if (!data) return null;

  const radius = 40;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="border-2 border-border rounded-lg p-4 bg-card-bg">
      <h3 className="text-lg mb-2">Hold Focus</h3>
      <div className="flex items-center justify-center">
        <div className="relative w-28 h-28">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {data.types.map((t) => {
              const dashLen = (t.percentage / 100) * circumference;
              const config = holdTypeConfig[t.type as HoldType];
              const segment = (
                <circle
                  key={t.type}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={config?.color || "#ccc"}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += dashLen;
              return segment;
            })}
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-display">
            {holdTypeConfig[data.focus as HoldType]?.letter}
          </span>
        </div>
        <div className="ml-4 flex flex-col gap-1 text-sm">
          {data.types.map((t) => {
            const config = holdTypeConfig[t.type as HoldType];
            return (
              <div key={t.type} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config?.color }} />
                <span>
                  {config?.label}: {t.percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
