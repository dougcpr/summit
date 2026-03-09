import { useQuery } from "convex/react";
import { HandGrabbing, Hand, HandPalm } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import { holdTypeConfig } from "../../lib/grades";
import type { HoldType } from "../../lib/grades";

const holdIcons: Record<HoldType, React.ElementType> = {
  jug: HandGrabbing,
  crimp: Hand,
  sloper: HandPalm,
};

export function HoldTypeRing() {
  const data = useQuery(api.analytics.holdTypeBreakdown);

  if (!data) return null;

  return (
    <div className="border-2 border-border rounded-lg p-3 bg-card-bg">
      <span className="text-xs opacity-50 uppercase tracking-wide">Hold Levels</span>
      <div className="flex flex-col gap-2 mt-2">
        {data.types.map((t) => {
          const config = holdTypeConfig[t.type as HoldType];
          const Icon = holdIcons[t.type as HoldType];
          const isWeakest = t.type === data.weakest;

          return (
            <div
              key={t.type}
              className="flex items-center justify-between px-2 py-1.5 rounded-md"
              style={{
                backgroundColor: isWeakest ? (config?.bgColor || "transparent") : "transparent",
              }}
            >
              <div className="flex items-center gap-2">
                {Icon && <Icon size={18} weight="bold" style={{ color: config?.color }} />}
                <span className="text-sm capitalize">{t.type}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-display">{t.gradeLevel}</span>
                {isWeakest && <span className="text-xs opacity-50">focus</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
