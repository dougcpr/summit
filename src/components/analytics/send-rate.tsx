import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function SendRate({ goalGrade }: { goalGrade: string }) {
  const data = useQuery(api.analytics.sendRates, { goalGrade });

  if (!data) return null;

  return (
    <div className="border-2 border-border rounded-lg p-4 bg-card-bg">
      <h3 className="text-lg mb-3">Send Rates (30d)</h3>
      <div className="flex flex-col gap-2">
        {data.map((row) => {
          const passing = row.actual >= row.expected;
          return (
            <div key={row.zone} className="flex items-center justify-between text-sm">
              <span>{row.zone}</span>
              <div className="flex items-center gap-2">
                <span className={passing ? "text-tertiary" : "text-secondary"} style={{ fontWeight: "bold" }}>
                  {row.actual}%
                </span>
                <span className="opacity-50">(≥{row.expected}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
