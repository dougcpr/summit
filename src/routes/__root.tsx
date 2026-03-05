import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { PencilSimple, ChartBar } from "@phosphor-icons/react";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="flex flex-col md:flex-row min-h-dvh bg-neutral-bg">
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-16 border-r-2 border-border bg-card-bg items-center py-4 gap-4">
        <Link
          to="/log"
          className="flex flex-col items-center p-2 rounded-lg text-sm"
          activeProps={{ className: "text-primary bg-primary/10" }}
          inactiveProps={{ className: "text-border/50 hover:text-border" }}
        >
          <PencilSimple size={24} weight="bold" />
        </Link>
        <Link
          to="/analytics"
          className="flex flex-col items-center p-2 rounded-lg text-sm"
          activeProps={{ className: "text-primary bg-primary/10" }}
          inactiveProps={{ className: "text-border/50 hover:text-border" }}
        >
          <ChartBar size={24} weight="bold" />
        </Link>
      </nav>

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex border-t-2 border-border bg-card-bg">
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
