import { useRef, useState, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { HandGrabbing, Hand, HandPalm } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { HoldType } from "../../lib/grades";

const holdIcons: Record<HoldType, React.ElementType> = {
  jug: HandGrabbing,
  crimp: Hand,
  sloper: HandPalm,
};

interface ClimbListProps {
  climbs: Doc<"climbs">[];
}

function ClimbChip({ climb }: { climb: Doc<"climbs"> }) {
  const removeClimb = useMutation(api.climbs.remove);
  const holdType = climb.holdType.toLowerCase() as HoldType;
  const HoldIcon = holdIcons[holdType];
  const handleDelete = () => {
    removeClimb({ id: climb._id as Id<"climbs"> });
  };

  return (
    <button
      onClick={handleDelete}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full shrink-0 active:brightness-90"
      style={{
        backgroundColor: climb.completed ? "var(--color-primary)" : "#d96c4f",
      }}
    >
      <span className="text-sm font-display text-border font-bold">
        {climb.grade}
      </span>
      {HoldIcon && <HoldIcon size={14} weight="bold" className="text-border/70" />}
    </button>
  );
}

export function ClimbList({ climbs }: ClimbListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hiddenCount, setHiddenCount] = useState(0);

  const calcHidden = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const chips = el.querySelectorAll("[data-chip]");
    let count = 0;
    for (const chip of chips) {
      const rect = chip.getBoundingClientRect();
      const parentRect = el.getBoundingClientRect();
      if (rect.right > parentRect.right + 4) count++;
    }
    setHiddenCount(count);
  }, []);

  useEffect(() => {
    calcHidden();
  }, [climbs, calcHidden]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", calcHidden, { passive: true });
    return () => el.removeEventListener("scroll", calcHidden);
  }, [calcHidden]);

  if (climbs.length === 0) {
    return (
      <p className="text-sm text-muted py-2">
        No climbs yet.
      </p>
    );
  }

  return (
    <div className="relative flex-1 min-w-0">
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {climbs.map((climb) => (
          <span key={climb._id} data-chip>
            <ClimbChip climb={climb} />
          </span>
        ))}
      </div>
      {hiddenCount > 0 && (
        <div className="absolute right-0 top-0 bottom-1 flex items-center pl-4 pointer-events-none" style={{ background: "linear-gradient(to right, transparent, var(--color-neutral-bg) 50%)" }}>
          <span className="text-xs font-display text-muted font-bold">+{hiddenCount}</span>
        </div>
      )}
    </div>
  );
}
