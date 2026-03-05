import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { api } from "../convex/_generated/api";
import { NoteEditor } from "../components/log/note-editor";
import { GradeSelector } from "../components/log/grade-selector";
import { HoldTypePicker } from "../components/log/hold-type-picker";
import { ActionButtons } from "../components/log/action-buttons";
import { formatDisplayDate, normalizeToNoon } from "../lib/dates";
import type { HoldType } from "../lib/grades";

export const Route = createFileRoute("/log")({
  component: LogPage,
});

function LogPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [grade, setGrade] = useState("V0");
  const [holdType, setHoldType] = useState<HoldType>("jug");

  const addClimb = useMutation(api.climbs.add);

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

  return (
    <div className="p-4 font-display max-w-lg mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={goBack} className="p-2 active:brightness-90">
          <CaretLeft size={24} weight="bold" />
        </button>
        <span className="text-xl">{formatDisplayDate(selectedDate)}</span>
        <button onClick={goForward} className="p-2 active:brightness-90">
          <CaretRight size={24} weight="bold" />
        </button>
      </div>

      <NoteEditor selectedDate={selectedDate} />

      <div className="flex items-center justify-between">
        <GradeSelector grade={grade} onChange={setGrade} />
        <HoldTypePicker selected={holdType} onChange={setHoldType} />
      </div>

      <ActionButtons onAttempt={() => handleLog(false)} onSend={() => handleLog(true)} />
    </div>
  );
}
