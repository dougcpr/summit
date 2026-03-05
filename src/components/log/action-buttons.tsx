import { Plus, Check } from "@phosphor-icons/react";

interface ActionButtonsProps {
  onAttempt: () => void;
  onSend: () => void;
}

export function ActionButtons({ onAttempt, onSend }: ActionButtonsProps) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onAttempt}
        className="flex-1 flex items-center justify-center gap-2 py-3 bg-secondary text-white rounded-lg text-xl active:brightness-90"
      >
        <Plus size={24} weight="bold" />
        Attempt
      </button>
      <button
        onClick={onSend}
        className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-lg text-xl active:brightness-90"
      >
        <Check size={24} weight="bold" />
        Send
      </button>
    </div>
  );
}
