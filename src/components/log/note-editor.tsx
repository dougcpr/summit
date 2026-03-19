import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { getDateKey } from "../../lib/dates";

export function NoteEditor({ selectedDate }: { selectedDate: Date }) {
  const dateKey = getDateKey(selectedDate);
  const existingNote = useQuery(api.notes.getByDate, { date: dateKey });
  const upsertNote = useMutation(api.notes.upsert);

  const [content, setContent] = useState("");
  const lastSavedRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const noteContent = existingNote?.content ?? "";
    setContent(noteContent);
    lastSavedRef.current = noteContent;
  }, [existingNote]);

  const save = useCallback(
    (text: string) => {
      if (text !== lastSavedRef.current) {
        lastSavedRef.current = text;
        upsertNote({ content: text, date: dateKey });
      }
    },
    [dateKey, upsertNote],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(value), 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <textarea
      value={content}
      onChange={handleChange}
      placeholder="Enter notes here..."
      className="w-full h-full p-3 font-display text-lg bg-transparent border border-border rounded-lg resize-none focus:outline-none focus:border-secondary"
    />
  );
}
