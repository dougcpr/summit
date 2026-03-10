import { useQuery } from "convex/react";
import { HandGrabbing, Hand, HandPalm } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import { holdTypeConfig, colorMap, fadedColorMap } from "../../lib/grades";
import type { HoldType } from "../../lib/grades";

const holdIcons: Record<HoldType, React.ElementType> = {
  jug: HandGrabbing,
  crimp: Hand,
  sloper: HandPalm,
};

export function HoldTypeRing({ goalGrade }: { goalGrade: string }) {
  const data = useQuery(api.analytics.holdTypeBreakdown, { goalGrade });

  if (!data) return <div className="border-2 border-border rounded-lg p-2 bg-card-bg flex-1" />;

  return (
    <div className="border-2 border-border rounded-lg p-2 bg-card-bg flex-1">
      <span className="text-xs opacity-50 uppercase tracking-wide">Hold Levels</span>
      <div className="flex flex-col gap-1 mt-1">
        {data.types.map((t) => {
          const config = holdTypeConfig[t.type as HoldType];
          const Icon = holdIcons[t.type as HoldType];
          const isWeakest = t.type === data.weakest;

          return (
            <div
              key={t.type}
              className="flex items-center justify-between px-2 py-1 rounded-md"
              style={{
                backgroundColor: isWeakest ? (fadedColorMap[t.gradeLevel] || "rgba(0,0,0,0.05)") : "transparent",
              }}
            >
              <div className="flex items-center gap-2">
                {Icon && <Icon size={18} weight="bold" style={{ color: colorMap[t.gradeLevel] || config?.color }} />}
                <span className="text-xs capitalize">{t.type}</span>
                {isWeakest && <span className="text-xs opacity-50">(focus)</span>}
              </div>
              <span className="text-sm font-semibold w-10 text-right">{t.gradeLevel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
