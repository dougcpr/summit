import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { X, Circle, CircleHalf, CheckCircle, type Icon } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { VocabChipPicker } from "./vocab-chip-picker";

type MoveState = "todo" | "working" | "done";

interface MoveDetailSheetProps {
  move: Doc<"projectMoves"> | null;
  onClose: () => void;
}

const STATES: { value: MoveState; label: string; Icon: Icon; color: string }[] = [
  { value: "todo",    label: "todo",    Icon: Circle,      color: "var(--color-secondary)" },
  { value: "working", label: "working", Icon: CircleHalf,  color: "var(--color-accent)" },
  { value: "done",    label: "done",    Icon: CheckCircle, color: "var(--color-primary)" },
];

export function MoveDetailSheet({ move, onClose }: MoveDetailSheetProps) {
  const updateState = useMutation(api.projects.updateMoveState);
  const updateVocab = useMutation(api.projects.updateMoveVocab);
  const updateNotes = useMutation(api.projects.updateMoveNotes);
  const deleteMove = useMutation(api.projects.deleteMove);

  const [notesDraft, setNotesDraft] = useState("");

  useEffect(() => {
    if (move) setNotesDraft(move.notes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [move?._id]);

  useEffect(() => {
    if (!move) return;
    if (notesDraft === move.notes) return;
    const timer = setTimeout(() => {
      updateNotes({ id: move._id as Id<"projectMoves">, notes: notesDraft });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesDraft, move?._id]);

  if (!move) return null;

  const handleStateChange = (next: MoveState) => {
    updateState({ id: move._id as Id<"projectMoves">, state: next });
  };

  const handleVocabChange = (next: string[]) => {
    updateVocab({ id: move._id as Id<"projectMoves">, vocabTags: next });
  };

  const handleNotesBlur = () => {
    if (notesDraft !== move.notes) {
      updateNotes({ id: move._id as Id<"projectMoves">, notes: notesDraft });
    }
  };

  const handleDelete = () => {
    if (confirm(`Delete move ${move.order}?`)) {
      deleteMove({ id: move._id as Id<"projectMoves"> });
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/30 z-40"
        aria-label="Close sheet"
      />
      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-bg rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 bg-border/20 rounded-full" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-border">
            Move {move.order}
          </h2>
          <button onClick={onClose} className="p-1 active:brightness-90">
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-xs uppercase font-display text-muted mb-2">State</p>
          <div className="flex gap-2">
            {STATES.map((s) => {
              const sel = move.state === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => handleStateChange(s.value)}
                  className={`flex-1 py-2 rounded-md text-sm font-display flex items-center justify-center gap-1.5 ${
                    sel
                      ? "text-border font-bold"
                      : "bg-card-bg text-border/70 border border-border/20"
                  }`}
                  style={sel ? { backgroundColor: s.color } : undefined}
                >
                  <s.Icon size={18} weight={sel ? "fill" : "bold"} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs uppercase font-display text-muted mb-2">Vocab</p>
          <VocabChipPicker selected={move.vocabTags} onChange={handleVocabChange} />
        </div>

        <div className="mb-4">
          <p className="text-xs uppercase font-display text-muted mb-2">Notes</p>
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={handleNotesBlur}
            rows={3}
            placeholder="High right heel, thumb catch on the gaston…"
            className="w-full p-2 rounded-md bg-card-bg border border-border/20 text-sm font-display text-border resize-none"
          />
        </div>

        <button
          onClick={handleDelete}
          className="w-full py-2 text-sm text-muted underline font-display"
        >
          Delete move
        </button>
      </div>
    </>
  );
}
