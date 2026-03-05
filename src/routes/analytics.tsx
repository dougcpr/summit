import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <div className="p-4 font-display">
      <h1 className="text-3xl text-accent">Analytics</h1>
      <p className="text-lg mt-2">Charts and progress will go here.</p>
    </div>
  );
}
