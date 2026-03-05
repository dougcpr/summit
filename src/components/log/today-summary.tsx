import type { Doc } from "@convex/_generated/dataModel";

interface TodaySummaryProps {
  climbs: Doc<"climbs">[];
}

export function TodaySummary({ climbs }: TodaySummaryProps) {
  const total = climbs.length;
  const sends = climbs.filter((c) => c.completed).length;
  const pct = total > 0 ? Math.round((sends / total) * 100) : 0;

  return (
    <div className="text-center py-2 px-3 border-2 border-border rounded-lg font-display text-lg bg-white">
      <span className="text-xl font-bold">{sends}/{total}</span>{" "}
      <span className="opacity-60">({pct}%)</span>
    </div>
  );
}
