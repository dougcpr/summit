import { Plus, Check } from "@phosphor-icons/react";

interface ActionButtonsProps {
  onAttempt: () => void;
  onSend: () => void;
  disabled?: boolean;
}

export function ActionButtons({ onAttempt, onSend, disabled }: ActionButtonsProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onAttempt}
        disabled={disabled}
        className="flex-1 flex items-center justify-center py-4 bg-secondary text-border border-2 border-border rounded-lg active:brightness-90 disabled:opacity-30 disabled:active:brightness-100"
      >
        <Plus size={32} weight="bold" />
      </button>
      <button
        onClick={onSend}
        disabled={disabled}
        className="flex-1 flex items-center justify-center py-4 bg-primary text-border border-2 border-border rounded-lg active:brightness-90 disabled:opacity-30 disabled:active:brightness-100"
      >
        <Check size={32} weight="bold" />
      </button>
    </div>
  );
}
