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
import { CoachCard } from "../components/analytics/coach-card";
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
  const [isRest, setIsRest] = useState(false);

  const addClimb = useMutation(api.climbs.add);
  const { startTime, endTime } = getLocalDayRange(selectedDate);
  const climbs = useQuery(api.climbs.getByDate, { startTime, endTime });

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

  const goalGrade = localStorage.getItem("summit-goal-grade") || "V5";

  return (
    <div className="p-4 font-display max-w-lg mx-auto flex flex-col gap-4 overflow-hidden" style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}>
      <CoachCard
        goalGrade={goalGrade}
        cycleAnchor="2026-03-05"
        ratioTransitionDate="2026-03-27"
        onRestStatus={setIsRest}
      />

      <div className="flex-1 min-h-0">
        <NoteEditor selectedDate={selectedDate} />
      </div>

      <div className="flex gap-2 shrink-0 items-stretch">
        <div className="flex flex-col gap-3 shrink-0">
          <GradeSelector grade={grade} onChange={setGrade} />
          <HoldTypePicker selected={holdType} onChange={setHoldType} />
          <ActionButtons
            onAttempt={() => handleLog(false)}
            onSend={() => handleLog(true)}
          />
        </div>

        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {climbs && (
            <>
              <TodaySummary climbs={climbs} />
              <div
                className="flex-1 min-h-0 border-2 border-border rounded-lg overflow-y-auto p-2"
                style={{ maxHeight: "13.25rem" }}
              >
                <ClimbList climbs={climbs} isRest={isRest} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between shrink-0">
        <button onClick={goBack} className="p-2 active:brightness-90">
          <CaretLeft size={24} weight="bold" />
        </button>
        <span className="text-xl">{formatDisplayDate(selectedDate)}</span>
        <button onClick={goForward} className="p-2 active:brightness-90">
          <CaretRight size={24} weight="bold" />
        </button>
      </div>
    </div>
  );
}
