import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { holdTypeConfig, type HoldType } from "../../lib/grades";

interface ProjectCardProps {
  project: {
    _id: Id<"projects">;
    name: string;
    grade: string;
    holdType: string;
    photoStorageId: Id<"_storage">;
    moveCount: number;
    movesDone: number;
    attempts: number;
    sessionDays: number;
  };
  onClick: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const photoUrl = useQuery(api.projects.getPhotoUrl, {
    storageId: project.photoStorageId,
  });
  const holdCfg = holdTypeConfig[project.holdType as HoldType];

  return (
    <button
      onClick={onClick}
      className="w-full bg-card-bg rounded-lg overflow-hidden flex gap-3 p-2 active:brightness-95"
    >
      <div className="w-16 h-16 shrink-0 bg-neutral-bg rounded-md overflow-hidden">
        {photoUrl && (
          <img src={photoUrl} alt="" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col items-start text-left">
        <h3 className="font-display font-bold text-border text-base truncate">
          {project.name}
        </h3>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-display font-bold text-border"
            style={{ backgroundColor: holdCfg?.color ?? "var(--color-primary)" }}
          >
            {project.grade}
          </span>
          <span className="text-xs text-muted">{holdCfg?.label}</span>
          <span className="text-xs text-border/70 font-display">
            {project.movesDone}/{project.moveCount}
          </span>
        </div>
        <p className="text-xs text-muted mt-1 font-display">
          {project.attempts} attempts · {project.sessionDays} days
        </p>
      </div>
    </button>
  );
}
