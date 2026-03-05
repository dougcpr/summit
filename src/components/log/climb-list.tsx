import { motion } from "framer-motion";
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

function ClimbListItem({ climb }: { climb: Doc<"climbs"> }) {
  const removeClimb = useMutation(api.climbs.remove);
  const holdType = climb.holdType.toLowerCase() as HoldType;
  const HoldIcon = holdIcons[holdType];
  const handleDelete = () => {
    removeClimb({ id: climb._id as Id<"climbs"> });
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: -100, right: 0 }}
      dragElastic={0.1}
      onDragEnd={(_, info) => {
        if (info.offset.x < -60) handleDelete();
      }}
      className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-border rounded-lg cursor-grab active:cursor-grabbing"
      style={{
        backgroundColor: climb.completed ? "var(--color-primary)" : "var(--color-secondary)",
      }}
    >
      <span className="text-xl font-display text-border">
        {climb.grade}
      </span>
      {HoldIcon && <HoldIcon size={24} weight="bold" className="text-border opacity-80" />}
    </motion.div>
  );
}

export function ClimbList({ climbs }: ClimbListProps) {
  return (
    <div className="flex flex-col gap-2">
      {climbs.map((climb) => (
        <ClimbListItem key={climb._id} climb={climb} />
      ))}
      {climbs.length === 0 && (
        <p className="text-center text-sm opacity-50 py-4">No climbs logged yet today.</p>
      )}
    </div>
  );
}
