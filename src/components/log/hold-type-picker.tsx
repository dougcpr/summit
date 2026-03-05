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
    <div className="flex gap-2">
      {(Object.keys(holdTypeConfig) as HoldType[]).map((type) => {
        const config = holdTypeConfig[type];
        const Icon = icons[type];
        const isSelected = selected === type;

        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-border text-xl transition-opacity active:brightness-90"
            style={{
              opacity: isSelected ? 1 : 0.35,
              backgroundColor: isSelected ? config.bgColor : "transparent",
            }}
          >
            <Icon size={24} weight="bold" />
            {config.letter}
          </button>
        );
      })}
    </div>
  );
}
