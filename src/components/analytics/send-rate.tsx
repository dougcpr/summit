import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { holdTypeConfig } from "../../lib/grades";
import type { HoldType } from "../../lib/grades";

export function SendRate({ goalGrade }: { goalGrade: string }) {
  const data = useQuery(api.analytics.sendRates, { goalGrade });
  const holdData = useQuery(api.analytics.holdTypeBreakdown);

  if (!data) return null;

  const focus = holdData ? holdTypeConfig[holdData.focus as HoldType] : null;

  return (
    <div className="border-2 border-border rounded-lg p-2 bg-card-bg">
      <div className="flex flex-col gap-1.5">
        {data.map((row) => {
          const passing = row.actual >= row.expected;
          return (
            <div key={row.zone} className="flex items-center justify-between text-base">
              <span>{row.zone}</span>
              <div className="flex items-center gap-2">
                <span className={passing ? "text-tertiary" : "text-secondary"} style={{ fontWeight: "bold" }}>
                  {row.actual}%
                </span>
                <span className="opacity-50 text-xs">(≥{row.expected}%)</span>
              </div>
            </div>
          );
        })}
        {focus && (
          <div className="flex items-center justify-between text-sm pt-1 border-t border-border/30">
            <span className="opacity-50">Focus</span>
            <span style={{ color: focus.color, fontWeight: "bold" }}>{focus.label}s</span>
          </div>
        )}
      </div>
    </div>
  );
}
