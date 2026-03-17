import { useQuery } from "convex/react";
import { Star } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";

const typeColors: Record<string, string> = {
  milestone: "var(--color-primary)",
  holdup: "var(--color-accent)",
  sendrate: "var(--color-tertiary)",
};

interface HighlightsCardProps {
  goalGrade: string;
  compact?: boolean;
}

export function HighlightsCard({ goalGrade, compact }: HighlightsCardProps) {
  const data = useQuery(api.analytics.weeklyHighlights, { goalGrade });

  if (!data) {
    return <div className="border-2 border-border rounded-lg p-2 bg-card-bg h-[4.5rem] flex-1" />;
  }

  const { highlights } = data;

  if (highlights.length === 0) {
    return (
      <div className="border-2 border-border rounded-lg p-2 bg-card-bg flex-1">
        <span className="text-xs opacity-50 uppercase tracking-wide">This Week</span>
        <div className="mt-2">
          <span className="text-sm opacity-40">Keep climbing — highlights build as the week goes</span>
        </div>
      </div>
    );
  }

  if (compact) {
    const top = highlights[0];
    return (
      <div className="border-2 border-border rounded-lg p-2 bg-card-bg flex flex-col gap-1.5 flex-1">
        <span className="text-xs opacity-50 uppercase tracking-wide">This Week</span>
        <div className="flex items-start gap-2">
          <Star size={14} weight="fill" className="mt-1 shrink-0" style={{ color: typeColors[top.type] }} />
          <span className="text-sm leading-snug">{top.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-border rounded-lg p-2 bg-card-bg flex-1">
      <span className="text-xs opacity-50 uppercase tracking-wide">This Week</span>
      <div className="flex flex-col gap-2 mt-2">
        {highlights.map((h, i) => (
          <div key={i} className="flex items-start gap-2">
            <span
              className="mt-1.5 w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: typeColors[h.type] }}
            />
            <span className="text-sm leading-snug">{h.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
