import { useState } from "react";
import { useMutation } from "convex/react";
import { Plus } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

interface AttemptButtonProps {
  projectId: Id<"projects">;
  grade: string;
  holdType: string;
}

export function AttemptButton({ projectId, grade, holdType }: AttemptButtonProps) {
  const addClimb = useMutation(api.climbs.add);
  const [pulsing, setPulsing] = useState(false);

  const handleClick = async () => {
    setPulsing(true);
    await addClimb({
      grade,
      completed: false,
      holdType,
      climbedAt: Date.now(),
      projectId,
    });
    setTimeout(() => setPulsing(false), 600);
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Log attempt"
      className={`flex-1 h-14 rounded-lg flex items-center justify-center text-border active:brightness-90 ${
        pulsing ? "animate-pulse" : ""
      }`}
      style={{ backgroundColor: "#d96c4f" }}
    >
      <Plus size={28} weight="bold" />
    </button>
  );
}
