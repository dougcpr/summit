import { Plus, Check, Barbell } from "@phosphor-icons/react";

interface ActionButtonsProps {
  onAttempt: () => void;
  onSend: () => void;
  onFingerboard: () => void;
  onStrength: () => void;
  disabled?: boolean;
}

export function ActionButtons({ onAttempt, onSend, onFingerboard, onStrength, disabled }: ActionButtonsProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onAttempt}
        disabled={disabled}
        className="flex-1 flex items-center justify-center py-4 text-border rounded-lg active:brightness-90 disabled:opacity-30 disabled:active:brightness-100"
        style={{ backgroundColor: "#d96c4f" }}
      >
        <Plus size={32} weight="bold" />
      </button>
      <button
        onClick={onSend}
        disabled={disabled}
        className="flex-1 flex items-center justify-center py-4 bg-primary text-border rounded-lg active:brightness-90 disabled:opacity-30 disabled:active:brightness-100"
      >
        <Check size={32} weight="bold" />
      </button>
      <button
        onClick={onFingerboard}
        disabled={disabled}
        className="flex-1 flex items-center justify-center py-4 text-white rounded-lg active:brightness-90 disabled:opacity-30 disabled:active:brightness-100 font-display font-bold text-2xl"
        style={{ backgroundColor: "#4a4a52" }}
      >
        FB
      </button>
      <button
        onClick={onStrength}
        disabled={disabled}
        className="flex-1 flex items-center justify-center py-4 text-white rounded-lg active:brightness-90 disabled:opacity-30 disabled:active:brightness-100"
        style={{ backgroundColor: "#4a4a52" }}
      >
        <Barbell size={32} weight="bold" />
      </button>
    </div>
  );
}
