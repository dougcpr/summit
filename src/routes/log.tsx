import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import { NoteEditor } from "../components/log/note-editor";
import { GradeSelector } from "../components/log/grade-selector";
import { HoldTypePicker } from "../components/log/hold-type-picker";
import { ActionButtons } from "../components/log/action-buttons";
import { TodaySummary } from "../components/log/today-summary";
import { ClimbList } from "../components/log/climb-list";

import { formatDisplayDate, normalizeToNoon, getLocalDayRange } from "../lib/dates";
import type { HoldType } from "../lib/grades";

export const Route = createFileRoute("/log")({
  component: LogPage,
  validateSearch: (search: Record<string, unknown>) => ({
    date: typeof search.date === "string" ? search.date : undefined,
  }),
});

function LogPage() {
  const { date: dateParam } = Route.useSearch();
  const [selectedDate, setSelectedDate] = useState(() => {
    if (dateParam) {
      const [y, m, d] = dateParam.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  });
  const [grade, setGrade] = useState("V0");
  const [holdType, setHoldType] = useState<HoldType>("jug");

  const addClimb = useMutation(api.climbs.add);
  const { startTime, endTime } = getLocalDayRange(selectedDate);
  const climbs = useQuery(api.climbs.getByDate, { startTime, endTime });

  const addTraining = useMutation(api.training.add);
  const trainingSessions = useQuery(api.training.getByDate, { startTime, endTime });

  const goBack = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const goForward = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const handleLog = (completed: boolean) => {
    addClimb({
      grade,
      completed,
      holdType,
      climbedAt: normalizeToNoon(selectedDate),
    });
  };

  const handleLogTraining = () => {
    addTraining({
      type: "fingerboard",
      trainedAt: normalizeToNoon(selectedDate),
    });
  };

  const handleLogStrength = () => {
    addTraining({
      type: "strength",
      trainedAt: normalizeToNoon(selectedDate),
    });
  };

  const today = new Date();
  const isToday =
    selectedDate.getFullYear() === today.getFullYear() &&
    selectedDate.getMonth() === today.getMonth() &&
    selectedDate.getDate() === today.getDate();

  return (
    <div className="px-4 pt-4 pb-1 font-display max-w-lg mx-auto flex flex-col overflow-hidden" style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}>
      {/* Top: notes area (flexible) */}
      <div className="flex-1 min-h-0">
        <NoteEditor selectedDate={selectedDate} />
      </div>

      {/* Climb chips + summary */}
      <div className="flex items-center gap-3 shrink-0 pt-3 pb-1">
        <TodaySummary climbs={climbs ?? []} />
        <div className="flex-1 min-w-0">
          <ClimbList climbs={climbs ?? []} trainingSessions={trainingSessions ?? []} />
        </div>
      </div>

      {/* Controls — thumb zone */}
      <div className="shrink-0 flex flex-col gap-2 pt-2">
        <GradeSelector grade={grade} onChange={setGrade} />
        <HoldTypePicker selected={holdType} onChange={setHoldType} />
        <ActionButtons
          onAttempt={() => handleLog(false)}
          onSend={() => handleLog(true)}
          onFingerboard={handleLogTraining}
          onStrength={handleLogStrength}
        />
      </div>

      {/* Date navigation */}
      <div className="flex flex-col items-center shrink-0 pt-1">
        <div className="flex items-center justify-between w-full">
          <button onClick={goBack} className="p-2 active:brightness-90">
            <CaretLeft size={24} weight="bold" />
          </button>
          <span className="text-xl">{formatDisplayDate(selectedDate)}</span>
          <button onClick={goForward} className="p-2 active:brightness-90">
            <CaretRight size={24} weight="bold" />
          </button>
        </div>
        <button
          onClick={() => setSelectedDate(new Date())}
          className={`text-sm text-muted hover:text-border active:text-border ${isToday ? "invisible" : ""}`}
        >
          Go to Today
        </button>
      </div>
    </div>
  );
}
