export interface Observation {
  message: string;
  type: "milestone" | "imbalance" | "consistency" | "goal" | "volume";
}

interface PyramidData {
  rows: { label: string; sends: number; attempts: number; target: number; color: string }[];
  weeksRemaining: number;
}

interface HoldTypeData {
  types: { type: string; gradeLevel: string; gradeLevelIdx: number }[];
  weakest: string;
}

interface HeatmapEntry {
  date: string;
  count: number;
}

interface TimelineData {
  startDate: number;
  endDate: number;
  now: number;
  timelines: { holdType: string; milestones: { grade: string; date: number }[] }[];
}

export function computeObservations(
  goalGrade: string,
  pyramid: PyramidData | undefined,
  holdTypes: HoldTypeData | undefined,
  heatmap: HeatmapEntry[] | undefined,
  timelines: TimelineData | null | undefined,
): Observation[] {
  const observations: Observation[] = [];
  const MAX = 3;

  // 1. Recent milestone — hold type reached new grade in last 30 days
  if (timelines) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const tl of timelines.timelines) {
      if (observations.length >= MAX) break;
      // Only report the most recent milestone per hold type
      const recentMilestones = tl.milestones.filter((ms) => ms.date >= thirtyDaysAgo);
      if (recentMilestones.length > 0) {
        const latest = recentMilestones[recentMilestones.length - 1];
        observations.push({
          message: `Hit ${latest.grade} on ${tl.holdType}s this month`,
          type: "milestone",
        });
      }
    }
  }

  // 2. Hold type imbalance — one hold type 1+ grades below the highest
  if (holdTypes && observations.length < MAX) {
    const maxIdx = Math.max(...holdTypes.types.map((t) => t.gradeLevelIdx));
    const behind = holdTypes.types.filter((t) => t.gradeLevelIdx >= 0 && maxIdx - t.gradeLevelIdx >= 1);
    if (behind.length > 0 && behind.length < holdTypes.types.length) {
      const ahead = holdTypes.types.filter((t) => t.gradeLevelIdx === maxIdx);
      const behindNames = behind.map((t) => t.type).join(" and ");
      const aheadNames = ahead.map((t) => t.type).join(" and ");
      const gap = maxIdx - Math.min(...behind.map((t) => t.gradeLevelIdx));
      observations.push({
        message: `${capitalize(behindNames)} ${gap === 1 ? "a grade" : `${gap} grades`} behind ${aheadNames}`,
        type: "imbalance",
      });
    }
  }

  // 3. Consistency — weeks with at least 1 climb in last 12 weeks
  if (heatmap && observations.length < MAX) {
    const now = new Date();
    const twelveWeeksAgo = new Date(now);
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84); // 12 * 7
    const recentDays = heatmap.filter((d) => new Date(d.date) >= twelveWeeksAgo);

    // Bucket into weeks (Sunday-based, matching app convention)
    const weeks = new Set<string>();
    for (const d of recentDays) {
      const date = new Date(d.date);
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weeks.add(`${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`);
    }

    if (weeks.size > 0) {
      observations.push({
        message: `Active ${weeks.size} of the last 12 weeks`,
        type: "consistency",
      });
    }
  }

  // 4. Goal proximity — sends at goal grade
  if (pyramid && observations.length < MAX) {
    const goalRow = pyramid.rows.find((r) => r.label === goalGrade);
    if (goalRow && goalRow.sends === 0) {
      observations.push({
        message: `0 ${goalGrade} sends — next milestone on the journey`,
        type: "goal",
      });
    }
  }

  // 5. Volume shift — active days in last 4 weeks vs prior 4 weeks, 25%+ difference
  if (heatmap && observations.length < MAX) {
    const now = new Date();
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const eightWeeksAgo = new Date(now);
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const recentCount = heatmap.filter((d) => new Date(d.date) >= fourWeeksAgo).length;
    const priorCount = heatmap.filter((d) => {
      const date = new Date(d.date);
      return date >= eightWeeksAgo && date < fourWeeksAgo;
    }).length;

    if (priorCount > 0) {
      const change = (recentCount - priorCount) / priorCount;
      if (change >= 0.25) {
        observations.push({ message: "Climbing more than usual lately", type: "volume" });
      } else if (change <= -0.25) {
        observations.push({ message: "Volume has dipped recently", type: "volume" });
      }
    }
  }

  return observations.slice(0, MAX);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
