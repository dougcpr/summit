import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export function SendRate({ goalGrade }: { goalGrade: string }) {
  const data = useQuery(api.analytics.sendRates, { goalGrade });

  if (!data) return null;

  return (
    <div className="border-2 border-border rounded-lg p-4 bg-card-bg h-full">
      <div className="flex flex-col justify-evenly h-full">
        {data.map((row) => {
          const passing = row.actual >= row.expected;
          return (
            <div key={row.zone} className="flex items-center justify-between text-lg">
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
