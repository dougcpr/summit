import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { useClerk } from "@clerk/clerk-react";
import { PencilSimple, ChartBar, SignOut, ArrowsClockwise } from "@phosphor-icons/react";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const { signOut } = useClerk();

  return (
    <div className="flex flex-col md:flex-row min-h-dvh bg-neutral-bg">
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-16 border-r-2 border-border bg-card-bg items-center py-4 gap-4">
        <Link
          to="/log"
          search={{ date: undefined }}
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
        <div className="flex-1" />
        <button
          onClick={() => window.location.reload()}
          className="flex flex-col items-center p-2 rounded-lg text-sm text-border/50 hover:text-border"
        >
          <ArrowsClockwise size={24} weight="bold" />
        </button>
        <button
          onClick={() => signOut()}
          className="flex flex-col items-center p-2 rounded-lg text-sm text-border/50 hover:text-border"
        >
          <SignOut size={24} weight="bold" />
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto md:pb-0" style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom))" }}>
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex border-t-2 border-border bg-card-bg" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <Link
          to="/log"
          search={{ date: undefined }}
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
        <button
          onClick={() => window.location.reload()}
          className="flex-1 flex flex-col items-center py-2 text-sm text-border/50"
        >
          <ArrowsClockwise size={24} weight="bold" />
          <span>Refresh</span>
        </button>
        <button
          onClick={() => signOut()}
          className="flex-1 flex flex-col items-center py-2 text-sm text-border/50"
        >
          <SignOut size={24} weight="bold" />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}
