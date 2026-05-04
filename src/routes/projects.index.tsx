import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Plus } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import { ProjectCard } from "../components/projects/project-card";

export const Route = createFileRoute("/projects/")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const { status } = useSearch({ from: "/projects" });
  const navigate = useNavigate();
  const projects = useQuery(api.projects.list, { status });

  const empty =
    status === "active"
      ? "No projects yet. Tap + to start one."
      : "Send your first project and it'll show up here.";

  return (
    <div className="px-4 pt-4 pb-8 font-display max-w-lg mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-border">Projects</h1>
        <Link
          to="/projects/new"
          search={{ status }}
          className="w-10 h-10 rounded-full bg-primary text-border flex items-center justify-center active:brightness-90"
        >
          <Plus size={20} weight="bold" />
        </Link>
      </div>

      <div className="flex gap-2">
        {(["active", "sent"] as const).map((s) => {
          const sel = status === s;
          return (
            <button
              key={s}
              onClick={() => navigate({ to: "/projects", search: { status: s } })}
              className={`px-4 py-2 rounded-full text-sm font-display ${
                sel
                  ? "bg-primary text-border font-bold"
                  : "bg-card-bg text-border/70 border border-border/20"
              }`}
            >
              {s === "active" ? "Active" : "Sent"}
            </button>
          );
        })}
      </div>

      {projects === undefined ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-muted text-center mt-8">{empty}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map((p) => (
            <ProjectCard
              key={p._id}
              project={p}
              onClick={() =>
                navigate({ to: "/projects/$projectId", params: { projectId: p._id }, search: { status } })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
