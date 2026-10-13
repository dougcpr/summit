import { Barbell, Basketball, LadderSimple, PersonSimpleWalk, Volleyball } from "@phosphor-icons/react";
import type { Doc } from "@convex/_generated/dataModel";

export type ActivityType = Doc<"trainingSessions">["type"];

// Non-bouldering activities, in dropdown order
export const ACTIVITIES: { type: ActivityType; label: string; icon: React.ElementType }[] = [
  { type: "strength", label: "Workout", icon: Barbell },
  { type: "fingerboard", label: "Fingerboard", icon: LadderSimple },
  { type: "volleyball", label: "Volleyball", icon: Volleyball },
  { type: "walking", label: "Walking", icon: PersonSimpleWalk },
  { type: "basketball", label: "Basketball", icon: Basketball },
];

export const activityIcon = (type: string): React.ElementType =>
  ACTIVITIES.find((a) => a.type === type)?.icon ?? Barbell;

const LAST_ACTIVITY_KEY = "summit-last-activity";

export function getLastActivity(): ActivityType {
  const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
  return ACTIVITIES.find((a) => a.type === stored)?.type ?? ACTIVITIES[0].type;
}

export function setLastActivity(type: ActivityType): void {
  localStorage.setItem(LAST_ACTIVITY_KEY, type);
}
