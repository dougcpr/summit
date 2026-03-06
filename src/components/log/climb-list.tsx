import { useMutation } from "convex/react";
import { HandGrabbing, Hand, HandPalm, X } from "@phosphor-icons/react";
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
  isRest?: boolean;
}

function ClimbListItem({ climb }: { climb: Doc<"climbs"> }) {
  const removeClimb = useMutation(api.climbs.remove);
  const holdType = climb.holdType.toLowerCase() as HoldType;
  const HoldIcon = holdIcons[holdType];
  const handleDelete = () => {
    removeClimb({ id: climb._id as Id<"climbs"> });
  };

  return (
    <div
      className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-border rounded-lg relative"
      style={{
        backgroundColor: climb.completed ? "var(--color-primary)" : "var(--color-accent)",
      }}
    >
      <span className="text-xl font-display text-border">
        {climb.grade}
      </span>
      {HoldIcon && <HoldIcon size={24} weight="bold" className="text-border opacity-80" />}
      <button
        onClick={handleDelete}
        className="absolute right-1 top-1 p-0.5 rounded-full opacity-40 hover:opacity-100 active:opacity-100"
      >
        <X size={14} weight="bold" className="text-border" />
      </button>
    </div>
  );
}

export function ClimbList({ climbs, isRest }: ClimbListProps) {
  if (isRest && climbs.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: "calc(13.25rem - 1rem)" }}>
        <span className="text-sm opacity-50">Rest day — enjoy the recovery.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {climbs.map((climb) => (
        <ClimbListItem key={climb._id} climb={climb} />
      ))}
      {climbs.length === 0 && (
        <p className="text-center text-sm opacity-50 h-full flex items-center justify-center">
          No climbs logged yet today.
        </p>
      )}
    </div>
  );
}
