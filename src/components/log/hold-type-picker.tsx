import { HandGrabbing, Hand, HandPalm } from "@phosphor-icons/react";
import type { HoldType } from "../../lib/grades";
import { holdTypeConfig } from "../../lib/grades";

interface HoldTypePickerProps {
  selected: HoldType;
  onChange: (type: HoldType) => void;
}

const icons: Record<HoldType, React.ElementType> = {
  jug: HandGrabbing,
  crimp: Hand,
  sloper: HandPalm,
};

export function HoldTypePicker({ selected, onChange }: HoldTypePickerProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {(Object.keys(holdTypeConfig) as HoldType[]).map((type) => {
        const config = holdTypeConfig[type];
        const Icon = icons[type];
        const isSelected = selected === type;

        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 border-border text-lg transition-opacity active:brightness-90"
            style={{
              opacity: isSelected ? 1 : 0.35,
              backgroundColor: isSelected ? config.bgColor : "transparent",
            }}
          >
            <Icon size={20} weight="bold" />
            {config.letter}
          </button>
        );
      })}
    </div>
  );
}
