import { Plus, Check } from "@phosphor-icons/react";

interface ActionButtonsProps {
  onAttempt: () => void;
  onSend: () => void;
}

export function ActionButtons({ onAttempt, onSend }: ActionButtonsProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onAttempt}
        className="flex-1 flex items-center justify-center py-4 bg-secondary text-border border-2 border-border rounded-lg active:brightness-90"
      >
        <Plus size={32} weight="bold" />
      </button>
      <button
        onClick={onSend}
        className="flex-1 flex items-center justify-center py-4 bg-primary text-border border-2 border-border rounded-lg active:brightness-90"
      >
        <Check size={32} weight="bold" />
      </button>
    </div>
  );
}
