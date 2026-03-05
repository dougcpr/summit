import { CaretUp, CaretDown } from "@phosphor-icons/react";
import { GRADES, colorMap } from "../../lib/grades";

interface GradeSelectorProps {
  grade: string;
  onChange: (grade: string) => void;
}

export function GradeSelector({ grade, onChange }: GradeSelectorProps) {
  const idx = GRADES.indexOf(grade as (typeof GRADES)[number]);

  const up = () => {
    if (idx < GRADES.length - 1) onChange(GRADES[idx + 1]);
  };

  const down = () => {
    if (idx > 0) onChange(GRADES[idx - 1]);
  };

  return (
    <div className="flex items-center gap-2 border-2 border-border rounded-lg p-2">
      <div className="flex flex-col gap-1">
        <button
          onClick={up}
          disabled={idx >= GRADES.length - 1}
          className="p-2 border-2 border-border rounded-lg disabled:opacity-30 active:brightness-90"
        >
          <CaretUp size={28} weight="bold" />
        </button>
        <button
          onClick={down}
          disabled={idx <= 0}
          className="p-2 border-2 border-border rounded-lg disabled:opacity-30 active:brightness-90"
        >
          <CaretDown size={28} weight="bold" />
        </button>
      </div>
      <span className="text-5xl font-display flex-1 text-center" style={{ color: colorMap[grade] }}>
        {grade}
      </span>
    </div>
  );
}
