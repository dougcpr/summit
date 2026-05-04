import { useState, useRef } from "react";
import { VOCAB, type VocabId } from "../../lib/vocabulary";

interface VocabChipPickerProps {
  selected: string[];
  onChange: (next: string[]) => void;
}

export function VocabChipPicker({ selected, onChange }: VocabChipPickerProps) {
  const [definedFor, setDefinedFor] = useState<VocabId | null>(null);
  const longPressTimer = useRef<number | null>(null);

  const isSelected = (id: string) => selected.includes(id);

  const toggle = (id: string) => {
    if (isSelected(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const startLongPress = (id: VocabId) => {
    longPressTimer.current = window.setTimeout(() => {
      setDefinedFor(id);
      longPressTimer.current = null;
    }, 400);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerUp = (id: VocabId) => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      toggle(id);
    }
  };

  const definedItem = definedFor ? VOCAB.find((v) => v.id === definedFor) : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {VOCAB.map((v) => {
          const sel = isSelected(v.id);
          return (
            <button
              key={v.id}
              onPointerDown={() => startLongPress(v.id)}
              onPointerUp={() => handlePointerUp(v.id)}
              onPointerLeave={cancelLongPress}
              onPointerCancel={cancelLongPress}
              className={`px-2.5 py-1.5 rounded-full text-xs font-display ${
                sel
                  ? "bg-primary text-border font-bold"
                  : "bg-card-bg text-border/70 border border-border/20"
              } active:brightness-95`}
            >
              {sel ? "✓ " : ""}
              {v.label}
            </button>
          );
        })}
      </div>
      {definedItem && (
        <div
          onClick={() => setDefinedFor(null)}
          className="bg-card-bg border border-border/20 rounded-md p-2 text-xs text-border/80"
        >
          <span className="font-bold">{definedItem.label}:</span>{" "}
          {definedItem.definition}
        </div>
      )}
    </div>
  );
}
