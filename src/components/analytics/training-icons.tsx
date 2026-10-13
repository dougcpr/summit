import { activityIcon } from "../../lib/activities";

const TRAINING_ICON = "#1e3a8a"; // tailwind blue-900 — navy for training icons

// One icon for a single activity; the first two side by side when there are several.
// Bold outlines read better than fills at calendar sizes.
export function TrainingIcons({ types, size }: { types: string[]; size: number }) {
  if (types.length === 1) {
    const Icon = activityIcon(types[0]);
    return <Icon size={size} weight="bold" className="opacity-85" style={{ color: TRAINING_ICON }} />;
  }
  const [First, Second] = types.slice(0, 2).map(activityIcon);
  const pairSize = Math.round(size * 0.7);
  return (
    <span className="flex items-center opacity-85" style={{ color: TRAINING_ICON, gap: 1 }}>
      <First size={pairSize} weight="bold" />
      <Second size={pairSize} weight="bold" />
    </span>
  );
}
