import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { NoteEditor } from "../components/log/note-editor";
import { formatDisplayDate } from "../lib/dates";

export const Route = createFileRoute("/log")({
  component: LogPage,
});

function LogPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  return (
    <div className="p-4 font-display max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={goBack} className="p-2 active:brightness-90">
          <CaretLeft size={24} weight="bold" />
        </button>
        <span className="text-xl">{formatDisplayDate(selectedDate)}</span>
        <button onClick={goForward} className="p-2 active:brightness-90">
          <CaretRight size={24} weight="bold" />
        </button>
      </div>

      <NoteEditor selectedDate={selectedDate} />
    </div>
  );
}
