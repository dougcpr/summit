import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { Trash } from "@phosphor-icons/react";
import { api } from "../../convex/_generated/api";
import { colorMap, holdTypeConfig } from "../../lib/grades";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { HoldType } from "../../lib/grades";

interface ClimbListProps {
  climbs: Doc<"climbs">[];
}

function ClimbListItem({ climb }: { climb: Doc<"climbs"> }) {
  const removeClimb = useMutation(api.climbs.remove);
  const holdConfig = holdTypeConfig[climb.holdType as HoldType];

  const handleDelete = () => {
    removeClimb({ id: climb._id as Id<"climbs"> });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="relative overflow-hidden"
    >
      <div className="absolute right-0 top-0 bottom-0 flex items-center pr-3">
        <button onClick={handleDelete} className="p-2 text-danger">
          <Trash size={20} weight="bold" />
        </button>
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) handleDelete();
        }}
        className="flex items-center gap-3 p-3 bg-card-bg border-2 border-border rounded-lg cursor-grab active:cursor-grabbing"
        style={{
          borderLeftColor: climb.completed ? colorMap[climb.grade] : "var(--color-secondary)",
          borderLeftWidth: 4,
        }}
      >
        <span className="text-xl font-display" style={{ color: colorMap[climb.grade] }}>
          {climb.grade}
        </span>
        <span className="text-sm" style={{ color: holdConfig?.color }}>
          {holdConfig?.letter}
        </span>
        <span className="ml-auto text-sm opacity-60">{climb.completed ? "sent" : "attempt"}</span>
      </motion.div>
    </motion.div>
  );
}

export function ClimbList({ climbs }: ClimbListProps) {
  return (
    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
      <AnimatePresence mode="popLayout">
        {climbs.map((climb) => (
          <ClimbListItem key={climb._id} climb={climb} />
        ))}
      </AnimatePresence>
      {climbs.length === 0 && (
        <p className="text-center text-sm opacity-50 py-4">No climbs logged yet today.</p>
      )}
    </div>
  );
}
