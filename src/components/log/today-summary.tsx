import type { Doc } from "@convex/_generated/dataModel";

interface TodaySummaryProps {
  climbs: Doc<"climbs">[];
}

export function TodaySummary({ climbs }: TodaySummaryProps) {
  const total = climbs.length;
  const sends = climbs.filter((c) => c.completed).length;
  const pct = total > 0 ? Math.round((sends / total) * 100) : 0;

  return (
    <span className="font-display text-sm text-muted">
      <span className="text-base font-bold text-border">{sends}/{total}</span>{" "}
      ({pct}%)
    </span>
  );
}
