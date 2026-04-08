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
            className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-lg text-lg active:brightness-90 transition-all"
            style={{
              backgroundColor: isSelected ? config.bgColor : "var(--color-neutral-bg)",
              border: isSelected ? "2px solid var(--color-border)" : "2px solid var(--color-border)",
              opacity: isSelected ? 1 : 0.5,
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
