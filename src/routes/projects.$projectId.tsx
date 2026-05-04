import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { CaretLeft, DotsThree } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { holdTypeConfig, type HoldType } from "../lib/grades";
import { ProjectCanvas } from "../components/projects/project-canvas";
import { MoveDetailSheet } from "../components/projects/move-detail-sheet";
import { AttemptButton } from "../components/projects/attempt-button";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const id = projectId as Id<"projects">;
  const project = useQuery(api.projects.get, { id });
  const moves = useQuery(api.projects.listMoves, { projectId: id });
  const allClimbs = useQuery(api.climbs.getAll);
  const renameProject = useMutation(api.projects.rename);
  const deleteProject = useMutation(api.projects.remove);

  const [selectedMoveId, setSelectedMoveId] = useState<Id<"projectMoves"> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // All hooks must run before any early return — keep loading checks below this line.
  if (project === undefined || moves === undefined) {
    return <p className="p-4 text-sm text-muted">Loading…</p>;
  }
  if (project === null) {
    return <p className="p-4 text-sm text-muted">Project not found.</p>;
  }
  if (!project.photoUrl) {
    return <p className="p-4 text-sm text-muted">Photo unavailable.</p>;
  }

  const holdCfg = holdTypeConfig[project.holdType as HoldType];
  const movesDone = moves.filter((m) => m.state === "done").length;
  const attempts = (allClimbs ?? []).filter((c) => c.projectId === id).length;
  const selectedMove =
    selectedMoveId ? moves.find((m) => m._id === selectedMoveId) ?? null : null;

  const handleRename = () => {
    const next = prompt("Rename project", project.name);
    if (next && next.trim() && next.trim() !== project.name) {
      renameProject({ id, name: next.trim() });
    }
    setMenuOpen(false);
  };

  const handleDelete = () => {
    if (confirm(`Delete "${project.name}"? This can't be undone.`)) {
      deleteProject({ id });
      navigate({ to: "/projects", search: { status: "active" } });
    }
    setMenuOpen(false);
  };

  return (
    <div className="px-4 pt-4 pb-8 font-display max-w-lg mx-auto flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate({ to: "/projects", search: { status: project.status } })}
          className="p-1 active:brightness-90"
        >
          <CaretLeft size={24} weight="bold" />
        </button>
        <h1 className="text-lg font-bold text-border truncate flex-1 text-center">
          {project.name}
        </h1>
        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="p-1 active:brightness-90">
            <DotsThree size={24} weight="bold" />
          </button>
          {menuOpen && (
            <>
              <div
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-20"
                aria-label="Close menu"
              />
              <div className="absolute right-0 top-8 bg-card-bg border border-border/20 rounded-md shadow-md z-30 w-32">
                <button
                  onClick={handleRename}
                  className="block w-full text-left px-3 py-2 text-sm text-border hover:bg-neutral-bg"
                >
                  Rename
                </button>
                <button
                  onClick={handleDelete}
                  className="block w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-neutral-bg"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span
          className="px-2 py-0.5 rounded-full text-xs font-bold text-border"
          style={{ backgroundColor: holdCfg?.color ?? "var(--color-primary)" }}
        >
          {project.grade}
        </span>
        <span className="text-muted">{holdCfg?.label}</span>
        {project.status === "sent" && (
          <span className="text-xs text-primary font-bold">✓ Sent</span>
        )}
      </div>

      <ProjectCanvas
        projectId={id}
        photoUrl={project.photoUrl}
        moves={moves}
        onMarkerTap={(m) => setSelectedMoveId(m._id as Id<"projectMoves">)}
      />

      <p className="text-sm text-muted text-center">
        {movesDone} / {moves.length} done · {attempts} attempts
      </p>

      <AttemptButton projectId={id} grade={project.grade} holdType={project.holdType} />

      <MoveDetailSheet move={selectedMove} onClose={() => setSelectedMoveId(null)} />
    </div>
  );
}
