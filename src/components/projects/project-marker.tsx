type MoveState = "todo" | "working" | "done";

interface ProjectMarkerProps {
  number: number;
  state: MoveState;
  x: number; // 0..1
  y: number; // 0..1
  onPointerDown?: (e: React.PointerEvent) => void;
}

const stateStyle: Record<MoveState, { fill: string; border: string; dashed: boolean; text: string }> = {
  todo:    { fill: "#d8d2c4", border: "#5a5a5a", dashed: false, text: "#3a3a3a" },
  working: { fill: "#bcd2ec", border: "#2d4a6b", dashed: true,  text: "#1d3a5b" },
  done:    { fill: "#a9c7a0", border: "#3a4a35", dashed: false, text: "#2a3a25" },
};

export function ProjectMarker({ number, state, x, y, onPointerDown }: ProjectMarkerProps) {
  const s = stateStyle[state];
  return (
    <button
      onPointerDown={onPointerDown}
      className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center font-display font-bold rounded-full text-sm select-none touch-none"
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: 32,
        height: 32,
        backgroundColor: s.fill,
        border: `2px ${s.dashed ? "dashed" : "solid"} ${s.border}`,
        color: s.text,
      }}
    >
      {number}
    </button>
  );
}
