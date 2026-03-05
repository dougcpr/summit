import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { GRADES, colorMap } from "../../lib/grades";
import { CaretDown } from "@phosphor-icons/react";

interface PyramidProps {
  goalGrade: string;
  onGoalChange: (grade: string) => void;
}

export function Pyramid({ goalGrade, onGoalChange }: PyramidProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const data = useQuery(api.analytics.pyramid, { goalGrade });

  const handleSetGoal = (g: string) => {
    onGoalChange(g);
    setShowDropdown(false);
  };

  if (!data) return null;

  const maxSends = Math.max(...data.rows.map((r) => r.sends), 1);

  return (
    <div className="border-2 border-border rounded-lg p-3 bg-card-bg">
      <div className="flex items-center justify-between mb-2">
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 font-display px-2 py-0.5 border-2 border-border rounded-full"
          >
            <span className="text-lg text-black">Goal</span>
            <span className="text-lg text-black">{goalGrade}</span>
            <CaretDown size={12} weight="bold" className="opacity-50 text-black" />
          </button>
          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-card-bg border-2 border-border rounded-lg shadow-lg z-10">
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => handleSetGoal(g)}
                  className="block w-full text-left px-3 py-1.5 text-base hover:bg-neutral-bg font-display"
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative w-12 h-12">
          <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
            <circle cx="22" cy="22" r="20" fill="none" stroke="var(--color-border)" strokeWidth="3" opacity="0.2" />
            <circle
              cx="22"
              cy="22"
              r="20"
              fill="none"
              stroke="var(--color-tertiary)"
              strokeWidth="3"
              strokeDasharray={`${(1 - data.weeksRemaining / 52) * 125.6} 125.6`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-display">
            {data.weeksRemaining}w
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {data.rows.map((row) => {
          const width = Math.max(10, Math.sqrt(row.sends / maxSends) * 100);
          const gradeColor = colorMap[row.label] || "var(--color-border)";
          const isGoal = row.sends === 0;
          return (
            <div key={row.label} className="flex items-center justify-center">
              <div
                className="h-8 rounded-lg flex items-center justify-center font-display text-sm transition-all"
                style={{
                  width: `${width}%`,
                  backgroundColor: isGoal ? "transparent" : gradeColor,
                  color: isGoal ? "var(--color-border)" : row.label === "V4" ? "white" : "var(--color-border)",
                  border: isGoal ? "2px dashed var(--color-border)" : "none",
                  minWidth: "4rem",
                }}
              >
                {row.label}: {row.sends}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
