import { createFileRoute, Outlet } from "@tanstack/react-router";

type Status = "active" | "sent";

export const Route = createFileRoute("/projects")({
  component: ProjectsLayout,
  validateSearch: (search: Record<string, unknown>) => ({
    status:
      search.status === "sent" || search.status === "active"
        ? (search.status as Status)
        : ("active" as const),
  }),
});

function ProjectsLayout() {
  return <Outlet />;
}
