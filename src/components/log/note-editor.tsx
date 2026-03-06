import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { Microphone } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import { getDateKey } from "../../lib/dates";

const SpeechRecognition: (new () => SpeechRecognitionInstance) | null =
  typeof window !== "undefined"
    ? ((window as unknown as Record<string, unknown>).SpeechRecognition as new () => SpeechRecognitionInstance) ??
      ((window as unknown as Record<string, unknown>).webkitSpeechRecognition as new () => SpeechRecognitionInstance) ??
      null
    : null;

export function NoteEditor({ selectedDate }: { selectedDate: Date }) {
  const dateKey = getDateKey(selectedDate);
  const existingNote = useQuery(api.notes.getByDate, { date: dateKey });
  const upsertNote = useMutation(api.notes.upsert);

  const [content, setContent] = useState("");
  const [listening, setListening] = useState(false);
  const lastSavedRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null);

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

  const scheduleAutoSave = useCallback(
    (text: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => save(text), 1000);
    },
    [save],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    scheduleAutoSave(value);
  };

  const toggleListening = () => {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    if (!SpeechRecognition) return;

    const recognition = createRecognition();
    recognitionRef.current = recognition;
    let processedUpTo = 0;

    recognition.onresult = (event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => {
      let finalTranscript = "";
      for (let i = processedUpTo; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
          processedUpTo = i + 1;
        }
      }
      if (finalTranscript) {
        setContent((prev) => {
          const next = prev ? prev + " " + finalTranscript : finalTranscript;
          scheduleAutoSave(next);
          return next;
        });
      }
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.start();
    setListening(true);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <textarea
        value={content}
        onChange={handleChange}
        placeholder="Enter notes here..."
        className="w-full h-full p-3 pb-10 font-display text-lg bg-card-bg border-2 border-border rounded-lg resize-none focus:outline-none focus:border-secondary"
      />
      {SpeechRecognition && (
        <button
          onClick={toggleListening}
          className="absolute bottom-3 right-3 p-1.5 rounded-full opacity-40 hover:opacity-80 active:opacity-100"
          style={listening ? { opacity: 1, color: "var(--color-danger)" } : undefined}
        >
          <Microphone size={20} weight="bold" className={listening ? "animate-pulse" : ""} />
        </button>
      )}
    </div>
  );
}

function createRecognition(): SpeechRecognitionInstance {
  const recognition = new SpeechRecognition!();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  return recognition;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: { results: Iterable<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
