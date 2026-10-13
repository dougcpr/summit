import { activityIcon } from "../../lib/activities";

const TRAINING_ICON = "#1e3a8a"; // tailwind blue-900 — navy for training icons

// One icon for a single activity; the first two split by a slash when there are several
export function TrainingIcons({ types, size }: { types: string[]; size: number }) {
  if (types.length === 1) {
    const Icon = activityIcon(types[0]);
    return <Icon size={size} weight="fill" className="opacity-50" style={{ color: TRAINING_ICON }} />;
  }
  const [First, Second] = types.slice(0, 2).map(activityIcon);
  return (
    <span className="flex items-center gap-px opacity-50" style={{ color: TRAINING_ICON }}>
      <First size={size - 2} weight="fill" />
      <span className="font-bold leading-none" style={{ fontSize: size - 1 }}>/</span>
      <Second size={size - 2} weight="fill" />
    </span>
  );
}
