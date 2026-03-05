import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/log")({
  component: LogPage,
});

function LogPage() {
  return (
    <div className="p-4 font-display">
      <h1 className="text-3xl text-primary">Daily Log</h1>
      <p className="text-lg mt-2">Notes and climb logging will go here.</p>
    </div>
  );
}
