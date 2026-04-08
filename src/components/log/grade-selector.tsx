import { CaretLeft, CaretRight } from "@phosphor-icons/react";
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
    <div className="flex items-center justify-center">
      <button
        onClick={down}
        disabled={idx <= 0}
        className="p-3 disabled:opacity-20 active:brightness-90"
      >
        <CaretLeft size={32} weight="bold" />
      </button>
      <span className="text-6xl font-display w-28 text-center" style={{ color: colorMap[grade] }}>
        {grade}
      </span>
      <button
        onClick={up}
        disabled={idx >= GRADES.length - 1}
        className="p-3 disabled:opacity-20 active:brightness-90"
      >
        <CaretRight size={32} weight="bold" />
      </button>
    </div>
  );
}
