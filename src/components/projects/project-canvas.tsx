import { useRef, useState, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { ProjectMarker } from "./project-marker";

interface ProjectCanvasProps {
  projectId: Id<"projects">;
  photoUrl: string;
  moves: Doc<"projectMoves">[];
  onMarkerTap: (move: Doc<"projectMoves">) => void;
}

const LONG_PRESS_MS = 200;
const DRAG_THRESHOLD_PX = 6;

interface DragState {
  moveId: Id<"projectMoves">;
  startClientX: number;
  startClientY: number;
  armedAt: number;
  isDragging: boolean;
  liveX: number; // fractional 0..1, current visual position during drag
  liveY: number;
}

export function ProjectCanvas({ projectId, photoUrl, moves, onMarkerTap }: ProjectCanvasProps) {
  const addMove = useMutation(api.projects.addMove);
  const updatePosition = useMutation(api.projects.updateMovePosition);
  const photoRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const sortedMoves = [...moves].sort((a, b) => a.order - b.order);

  const photoToFractional = useCallback((clientX: number, clientY: number) => {
    const el = photoRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return { x, y };
  }, []);

  // Tap on empty area = drop next-numbered marker
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (drag?.isDragging) return; // suppress click after a drag
    const target = e.target as HTMLElement;
    if (target.closest("[data-marker]")) return; // marker handles its own clicks
    const coords = photoToFractional(e.clientX, e.clientY);
    if (coords) addMove({ projectId, x: coords.x, y: coords.y });
  };

  // Marker pointer-down: arm a potential drag-or-tap
  const handleMarkerPointerDown = (move: Doc<"projectMoves">) => (e: React.PointerEvent) => {
    e.stopPropagation();
    setDrag({
      moveId: move._id as Id<"projectMoves">,
      startClientX: e.clientX,
      startClientY: e.clientY,
      armedAt: Date.now(),
      isDragging: false,
      liveX: move.x,
      liveY: move.y,
    });
  };

  // Pointer-move/up handling — re-binds when drag changes
  useEffect(() => {
    if (!drag) return;
    let current = drag;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - current.startClientX;
      const dy = e.clientY - current.startClientY;
      const elapsed = Date.now() - current.armedAt;
      const movedEnough = Math.hypot(dx, dy) > DRAG_THRESHOLD_PX;

      const shouldStartDrag =
        !current.isDragging && (movedEnough || elapsed > LONG_PRESS_MS);

      if (current.isDragging || shouldStartDrag) {
        const coords = photoToFractional(e.clientX, e.clientY);
        if (coords) {
          current = {
            ...current,
            isDragging: true,
            liveX: coords.x,
            liveY: coords.y,
          };
          setDrag(current);
        } else if (shouldStartDrag) {
          current = { ...current, isDragging: true };
          setDrag(current);
        }
      }
    };

    const onUp = () => {
      const wasDragging = current.isDragging;
      const movedTo = { x: current.liveX, y: current.liveY };
      const m = moves.find((mv) => (mv._id as string) === (current.moveId as string));
      setDrag(null);
      if (wasDragging) {
        updatePosition({ id: current.moveId, x: movedTo.x, y: movedTo.y });
      } else if (m) {
        onMarkerTap(m);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.moveId, moves, onMarkerTap, photoToFractional, updatePosition]);

  return (
    <div className="flex flex-col items-center w-full">
      <div
        ref={photoRef}
        onClick={handleCanvasClick}
        className="relative w-full max-w-md aspect-[3/4] bg-card-bg rounded-lg overflow-hidden touch-none"
      >
        <img
          src={photoUrl}
          alt="Project wall"
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
        {sortedMoves.map((m, idx) => {
          const isBeingDragged =
            drag?.isDragging && (drag.moveId as string) === (m._id as string);
          return (
            <span key={m._id} data-marker>
              <ProjectMarker
                number={idx + 1}
                state={m.state}
                x={isBeingDragged ? drag.liveX : m.x}
                y={isBeingDragged ? drag.liveY : m.y}
                onPointerDown={handleMarkerPointerDown(m)}
              />
            </span>
          );
        })}
      </div>
      {sortedMoves.length === 0 && (
        <p className="mt-2 text-xs text-muted font-display">
          Tap a hold to add a move
        </p>
      )}
    </div>
  );
}
