import { useEffect, useRef, useState } from "react";
import { Plus, Check, CaretUp } from "@phosphor-icons/react";
import { ACTIVITIES, type ActivityType, activityIcon, getLastActivity, setLastActivity } from "../../lib/activities";

interface ActionButtonsProps {
  onAttempt: () => void;
  onSend: () => void;
  onActivity: (type: ActivityType) => void;
  disabled?: boolean;
}

export function ActionButtons({ onAttempt, onSend, onActivity, disabled }: ActionButtonsProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onAttempt}
        disabled={disabled}
        className="flex-1 flex items-center justify-center py-4 text-border rounded-lg active:brightness-90 disabled:opacity-30 disabled:active:brightness-100"
        style={{ backgroundColor: "var(--color-attempt)" }}
      >
        <Plus size={32} weight="bold" />
      </button>
      <button
        onClick={onSend}
        disabled={disabled}
        className="flex-1 flex items-center justify-center py-4 bg-primary text-border rounded-lg active:brightness-90 disabled:opacity-30 disabled:active:brightness-100"
      >
        <Check size={32} weight="bold" />
      </button>
      <ActivityMenu onSelect={onActivity} disabled={disabled} />
    </div>
  );
}

function ActivityMenu({ onSelect, disabled }: { onSelect: (type: ActivityType) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ActivityType>(getLastActivity);
  const ref = useRef<HTMLDivElement>(null);
  const SelectedIcon = activityIcon(selected);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const choose = (type: ActivityType) => {
    setSelected(type);
    setLastActivity(type);
    onSelect(type);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative flex-[2] flex">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-label="Log activity"
        aria-expanded={open}
        className="flex-1 flex items-center justify-center gap-1.5 py-4 text-white rounded-lg active:brightness-90 disabled:opacity-30 disabled:active:brightness-100"
        style={{ backgroundColor: "var(--color-training)" }}
      >
        <SelectedIcon size={32} weight="bold" />
        <CaretUp size={14} weight="bold" className={`opacity-70 transition-transform ${open ? "" : "rotate-180"}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 mb-2 z-50 flex gap-1 p-1.5 rounded-lg border border-border/15 bg-card-bg shadow-lg"
        >
          {ACTIVITIES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              role="menuitem"
              onClick={() => choose(type)}
              aria-label={label}
              className={`flex flex-col items-center gap-0.5 w-14 py-2 rounded-md text-white active:brightness-90 ${
                type === selected ? "ring-2 ring-primary" : ""
              }`}
              style={{ backgroundColor: "var(--color-training)" }}
            >
              <Icon size={26} weight="bold" />
              <span className="text-[11px] leading-none opacity-80">{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
