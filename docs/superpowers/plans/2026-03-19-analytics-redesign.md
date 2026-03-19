# Analytics Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the analytics page from four separate card-based sections into a single continuous narrative with three chapters: Where I Am, How I Got Here, What's Next.

**Architecture:** Remove card borders and reorder existing components into a scrollable narrative flow. Add two new lightweight components (HoldTypeSummary, Observations) and one client-side hook (useObservations). Existing Convex queries are reused as-is — no backend changes.

**Tech Stack:** React 19, Convex (queries only — no changes), Tailwind CSS, Phosphor Icons

**Spec:** `docs/superpowers/specs/2026-03-19-analytics-redesign-design.md`

---

## File Structure

### Modified files
| File | Responsibility |
|------|---------------|
| `src/routes/analytics.tsx` | Page layout — chapter structure, scroll container, goal grade selector |
| `src/components/analytics/pyramid.tsx` | Remove card border/bg wrapper |
| `src/components/analytics/journey-timeline.tsx` | Remove card border/bg wrapper |
| `src/components/analytics/hold-type-timeline.tsx` | Remove card border/bg wrapper and section title |
| `src/components/analytics/activity-heatmap.tsx` | Remove card border/bg wrapper, instant scroll behavior |

### New files
| File | Responsibility |
|------|---------------|
| `src/components/analytics/hold-type-summary.tsx` | Compact inline display of current hold type levels |
| `src/components/analytics/observations.tsx` | Renders 2-3 observation bullets |
| `src/lib/use-observations.ts` | Pure logic hook: waterfall observation computation from query data |

---

## Task 1: Strip card wrappers from existing components

Remove `border-2 border-border rounded-lg bg-card-bg` card styling from all four existing analytics components. They will be rendered borderless inside the new chapter layout.

**Files:**
- Modify: `src/components/analytics/pyramid.tsx:13,23`
- Modify: `src/components/analytics/journey-timeline.tsx:18,26`
- Modify: `src/components/analytics/hold-type-timeline.tsx:22,28,49`
- Modify: `src/components/analytics/activity-heatmap.tsx:28,49`

- [ ] **Step 1: Strip Pyramid card wrapper**

In `pyramid.tsx`, change the loading skeleton (line 13) and outer div (line 23):

```tsx
// Line 13: loading state — remove card styling
if (!data) return <div className="h-[11rem]" />;

// Line 23: outer wrapper — remove card styling, keep padding
<div className="p-2">
```

- [ ] **Step 2: Strip JourneyTimeline card wrapper**

In `journey-timeline.tsx`, change loading skeleton (line 18) and outer div (line 26):

```tsx
// Line 18: loading state
if (!timeline) return <div className="h-[5.5rem]" />;

// Line 26: outer wrapper
<div className="p-2">
```

Also remove the "Journey" label (line 27: `<span className="text-xs opacity-50 uppercase tracking-wide">Journey</span>`) — the chapter heading will serve this purpose.

- [ ] **Step 3: Strip HoldTypeTimeline card wrapper**

In `hold-type-timeline.tsx`, change loading skeletons (lines 22, 28) and outer div (line 49):

```tsx
// Line 22: loading state
if (!data) return <div className="h-[7rem]" />;

// Line 28: empty data state
if (allDates.length === 0) return <div className="h-[7rem]" />;

// Line 49: outer wrapper
<div className="p-2 pb-3">
```

Remove the "Hold Levels" label (line 50: `<span className="text-xs opacity-50 uppercase tracking-wide">Hold Levels</span>`).

- [ ] **Step 4: Strip ActivityHeatmap card wrapper and fix scroll behavior**

In `activity-heatmap.tsx`, change loading skeleton (line 28) and outer div (line 49):

```tsx
// Line 28: loading state
if (!data) return <div className="h-[9.5rem]" />;

// Line 49: outer wrapper
<div className="p-2">
```

Also update the `useEffect` (line 23-25) to use instant scroll to avoid conflicting with page scroll:

```tsx
useEffect(() => {
  if (scrollRef.current) {
    scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }
}, [data]);
```

(The current implementation already sets `scrollLeft` directly which is instant — no change needed here. Just verify it doesn't use `scrollTo` with `behavior: 'smooth'`.)

- [ ] **Step 5: Verify the app builds**

Run: `pnpm build`
Expected: Build succeeds. Components render without card borders.

- [ ] **Step 6: Commit**

```bash
git add src/components/analytics/pyramid.tsx src/components/analytics/journey-timeline.tsx src/components/analytics/hold-type-timeline.tsx src/components/analytics/activity-heatmap.tsx
git commit -m "refactor: strip card wrappers from analytics components"
```

---

## Task 2: Create HoldTypeSummary component

New compact component showing current hold type level inline below the pyramid.

**Files:**
- Create: `src/components/analytics/hold-type-summary.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { colorMap } from "../../lib/grades";

export function HoldTypeSummary({ goalGrade }: { goalGrade: string }) {
  const data = useQuery(api.analytics.holdTypeBreakdown, { goalGrade });

  if (!data) return null;

  return (
    <div className="flex justify-around py-2">
      {data.types.map((t) => (
        <div key={t.type} className="text-center">
          <div className="text-[10px] uppercase tracking-wide opacity-50">
            {t.type}
          </div>
          <div
            className="text-xl font-bold font-display"
            style={{ color: t.gradeLevel === "—" ? "var(--color-border)" : colorMap[t.gradeLevel] || "var(--color-border)" }}
          >
            {t.gradeLevel}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/hold-type-summary.tsx
git commit -m "feat: add HoldTypeSummary component"
```

---

## Task 3: Create useObservations hook

Pure logic hook that computes observations from existing query results. No React dependencies beyond the return type.

**Files:**
- Create: `src/lib/use-observations.ts`

- [ ] **Step 1: Define types and helper functions**

```ts
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
```

- [ ] **Step 2: Implement the waterfall logic**

```ts
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
```

- [ ] **Step 3: Verify it builds**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/use-observations.ts
git commit -m "feat: add computeObservations logic for analytics observations"
```

---

## Task 4: Create Observations component

Renders the observation bullets from the useObservations hook.

**Files:**
- Create: `src/components/analytics/observations.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { computeObservations } from "../../lib/use-observations";

const dotColors: Record<string, string> = {
  milestone: "rgba(106, 153, 78, 0.8)",   // green
  imbalance: "rgba(89, 149, 163, 0.8)",   // teal
  consistency: "rgba(106, 153, 78, 0.8)", // green
  goal: "rgba(228, 196, 77, 0.8)",        // gold
  volume: "rgba(217, 108, 79, 0.8)",      // coral
};

export function Observations({ goalGrade }: { goalGrade: string }) {
  const pyramid = useQuery(api.analytics.pyramid, { goalGrade });
  const holdTypes = useQuery(api.analytics.holdTypeBreakdown, { goalGrade });
  const heatmap = useQuery(api.analytics.heatmapData);
  const timelines = useQuery(api.analytics.holdTypeTimelines, { goalGrade });

  const observations = computeObservations(goalGrade, pyramid, holdTypes, heatmap, timelines);

  if (observations.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5 py-2">
      {observations.map((obs, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div
            className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
            style={{ backgroundColor: dotColors[obs.type] || "var(--color-border)" }}
          />
          <span className="text-sm opacity-70">{obs.message}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/observations.tsx
git commit -m "feat: add Observations component"
```

---

## Task 5: Rewrite analytics page layout

Replace the current card stack with three-chapter narrative layout. This is the main integration task.

**Files:**
- Modify: `src/routes/analytics.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the page component**

Replace the entire content of `analytics.tsx`:

```tsx
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { GRADES } from "../lib/grades";
import { Pyramid } from "../components/analytics/pyramid";
import { HoldTypeSummary } from "../components/analytics/hold-type-summary";
import { JourneyTimeline } from "../components/analytics/journey-timeline";
import { HoldTypeTimeline } from "../components/analytics/hold-type-timeline";
import { ActivityHeatmap } from "../components/analytics/activity-heatmap";
import { Observations } from "../components/analytics/observations";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [goalGrade, setGoalGrade] = useState(
    () => localStorage.getItem("summit-goal-grade") || "V5",
  );

  const handleGoalChange = (g: string) => {
    setGoalGrade(g);
    localStorage.setItem("summit-goal-grade", g);
  };

  // Empty state check
  const heatmap = useQuery(api.analytics.heatmapData);
  const isEmpty = heatmap && heatmap.length < 10;

  if (heatmap && isEmpty) {
    return (
      <div
        className="p-4 font-display max-w-lg mx-auto flex items-center justify-center overflow-y-auto"
        style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}
      >
        <p className="text-center opacity-50">
          Log some more climbs to see your analytics!
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-2 font-display max-w-lg mx-auto overflow-y-auto"
      style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}
    >
      {/* Goal grade selector */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-xs opacity-50">Goal</span>
        <select
          value={goalGrade}
          onChange={(e) => handleGoalChange(e.target.value)}
          className="text-xs font-display bg-transparent border border-border rounded px-1.5 py-0.5"
        >
          {GRADES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* Chapter 1: Where I Am */}
      <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">
        Where I Am
      </div>
      <Pyramid goalGrade={goalGrade} />
      <HoldTypeSummary goalGrade={goalGrade} />

      <hr className="border-border/30 my-4" />

      {/* Chapter 2: How I Got Here */}
      <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">
        How I Got Here
      </div>
      <JourneyTimeline goalGrade={goalGrade} />
      <div className="mt-3" />
      <HoldTypeTimeline goalGrade={goalGrade} />
      <div className="mt-3" />
      <ActivityHeatmap />

      <hr className="border-border/30 my-4" />

      {/* Chapter 3: What's Next */}
      <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">
        What's Next
      </div>
      <Observations goalGrade={goalGrade} />

      <div className="h-8" />
    </div>
  );
}
```

- [ ] **Step 2: Verify the app builds and renders**

Run: `pnpm build`
Expected: Build succeeds.

Then run `pnpm dev` and manually verify:
- Page scrolls continuously (no `overflow-hidden`)
- Three chapter labels visible: "Where I Am", "How I Got Here", "What's Next"
- Pyramid renders without card border
- Hold type summary shows below pyramid
- Journey timeline renders without card border
- Hold type timelines render without card border
- Activity heatmap always visible (no toggle)
- Observations section shows 2-3 bullets
- Goal grade selector at top works
- Thin dividers separate chapters

- [ ] **Step 3: Commit**

```bash
git add src/routes/analytics.tsx
git commit -m "feat: redesign analytics page with three-chapter narrative layout"
```

---

## Task 6: Clean up unused Pyramid prop

Remove the unused `onGoalChange` from the PyramidProps interface (the call site in analytics.tsx already omits it after Task 5).

**Files:**
- Modify: `src/components/analytics/pyramid.tsx:5-8`

- [ ] **Step 1: Clean up Pyramid props**

In `pyramid.tsx`, the `PyramidProps` interface (line 5-8) declares `onGoalChange` but it's never used in the component. Remove it:

```tsx
interface PyramidProps {
  goalGrade: string;
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds with no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/pyramid.tsx
git commit -m "refactor: remove unused onGoalChange prop from Pyramid"
```
