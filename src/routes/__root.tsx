import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { PencilSimple, ChartBar } from "@phosphor-icons/react";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="flex flex-col min-h-dvh bg-neutral-bg">
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 flex border-t-2 border-border bg-card-bg">
        <Link
          to="/log"
          className="flex-1 flex flex-col items-center py-2 text-sm"
          activeProps={{ className: "text-primary" }}
          inactiveProps={{ className: "text-border/50" }}
        >
          <PencilSimple size={24} weight="bold" />
          <span>Log</span>
        </Link>
        <Link
          to="/analytics"
          className="flex-1 flex flex-col items-center py-2 text-sm"
          activeProps={{ className: "text-primary" }}
          inactiveProps={{ className: "text-border/50" }}
        >
          <ChartBar size={24} weight="bold" />
          <span>Analytics</span>
        </Link>
      </nav>
    </div>
  );
}
