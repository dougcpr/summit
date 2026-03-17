# Weekly Highlights Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace weekly zones with a celebratory highlights reel showing grade milestones, hold type level-ups, and send rate improvements.

**Architecture:** A new `weeklyHighlights` Convex query computes highlights by comparing this week's data to last week's and checking all-time milestone thresholds. A new `HighlightsCard` component renders either a compact single-highlight view (log page) or a full list (analytics page).

**Tech Stack:** Convex (backend query), React/TypeScript (frontend components)

**Spec:** `docs/plans/2026-03-17-weekly-highlights-design.md`

---

## Chunk 1: Backend Query + Frontend Component + Integration

### Task 1: Add weeklyHighlights query

**Files:**
- Modify: `convex/analytics.ts` — add new query after `coachNudges`

- [ ] **Step 1: Add the weeklyHighlights query**

Add this query at the end of `convex/analytics.ts` (after the closing `});` of `coachNudges`):

```typescript
// --- Weekly Highlights ---

export const weeklyHighlights = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const goalIdx = gradeIdx(args.goalGrade);
    if (goalIdx < 0) return { highlights: [] };

    const projectIdx = goalIdx - 1;
    const buildMinIdx = Math.max(0, goalIdx - 3);

    const now = new Date();
    const thisWeekStart = getStartOfWeek(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // Fetch all climbs (needed for milestone detection)
    const allClimbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const thisWeekClimbs = allClimbs.filter((c) => c.climbedAt >= thisWeekStart.getTime());
    const lastWeekClimbs = allClimbs.filter(
      (c) => c.climbedAt >= lastWeekStart.getTime() && c.climbedAt < thisWeekStart.getTime(),
    );
    const beforeThisWeek = allClimbs.filter((c) => c.climbedAt < thisWeekStart.getTime());

    const highlights: { message: string; type: "milestone" | "holdup" | "sendrate" }[] = [];

    // --- Priority 1: Grade consistency milestones ---
    // 3rd+ send at any grade happened this week
    const sendsBeforeThisWeek: Record<string, number> = {};
    for (const c of beforeThisWeek) {
      if (c.completed) {
        sendsBeforeThisWeek[c.grade] = (sendsBeforeThisWeek[c.grade] || 0) + 1;
      }
    }
    const sendsThisWeek: Record<string, number> = {};
    for (const c of thisWeekClimbs) {
      if (c.completed) {
        sendsThisWeek[c.grade] = (sendsThisWeek[c.grade] || 0) + 1;
      }
    }
    // Check each grade: if before < 3 and before + thisWeek >= 3
    for (let i = GRADES.length - 1; i >= 0; i--) {
      const grade = GRADES[i];
      const before = sendsBeforeThisWeek[grade] || 0;
      const thisWeek = sendsThisWeek[grade] || 0;
      if (before < 3 && before + thisWeek >= 3) {
        highlights.push({
          message: `${grade} locked in — 3 consistent sends`,
          type: "milestone",
        });
      }
    }

    // --- Priority 2: Hold type level-up ---
    // Highest grade with 2+ sends improved this week vs last week
    const holdTypes = ["jug", "crimp", "sloper"];
    function highestHoldLevel(climbs: typeof allClimbs, holdType: string): number {
      const sendsByGrade: Record<string, number> = {};
      for (const c of climbs) {
        if (c.completed && c.holdType.toLowerCase() === holdType) {
          sendsByGrade[c.grade] = (sendsByGrade[c.grade] || 0) + 1;
        }
      }
      let highest = -1;
      for (const [grade, count] of Object.entries(sendsByGrade)) {
        const idx = gradeIdx(grade);
        if (count >= 2 && idx > highest) highest = idx;
      }
      return highest;
    }
    for (const ht of holdTypes) {
      const thisLevel = highestHoldLevel(thisWeekClimbs, ht);
      const lastLevel = highestHoldLevel(lastWeekClimbs, ht);
      if (thisLevel > lastLevel && lastLevel >= 0) {
        highlights.push({
          message: `${ht} level up: ${GRADES[lastLevel]} → ${GRADES[thisLevel]}`,
          type: "holdup",
        });
      }
    }

    // --- Priority 3: Send rate improvement ---
    // Build/project grade send rate improved 10+ points this week vs last (min 3 attempts both)
    for (let i = buildMinIdx; i <= projectIdx; i++) {
      const grade = GRADES[i];
      let twSends = 0, twTotal = 0, lwSends = 0, lwTotal = 0;
      for (const c of thisWeekClimbs) {
        if (c.grade === grade) {
          twTotal++;
          if (c.completed) twSends++;
        }
      }
      for (const c of lastWeekClimbs) {
        if (c.grade === grade) {
          lwTotal++;
          if (c.completed) lwSends++;
        }
      }
      if (twTotal >= 3 && lwTotal >= 3) {
        const twRate = Math.round((twSends / twTotal) * 100);
        const lwRate = Math.round((lwSends / lwTotal) * 100);
        if (twRate - lwRate >= 10) {
          highlights.push({
            message: `${grade} send rate: ${lwRate}% → ${twRate}%`,
            type: "sendrate",
          });
        }
      }
    }

    return { highlights };
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: Only pre-existing weekly-zones errors, no new errors.

- [ ] **Step 3: Commit**

```bash
git add convex/analytics.ts
git commit -m "feat: add weeklyHighlights query"
```

### Task 2: Create HighlightsCard component

**Files:**
- Create: `src/components/analytics/highlights-card.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useQuery } from "convex/react";
import { Star } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";

const typeColors: Record<string, string> = {
  milestone: "var(--color-primary)",
  holdup: "var(--color-accent)",
  sendrate: "var(--color-tertiary)",
};

interface HighlightsCardProps {
  goalGrade: string;
  compact?: boolean;
}

export function HighlightsCard({ goalGrade, compact }: HighlightsCardProps) {
  const data = useQuery(api.analytics.weeklyHighlights, { goalGrade });

  if (!data) {
    return <div className="border-2 border-border rounded-lg p-2 bg-card-bg h-[4.5rem]" />;
  }

  const { highlights } = data;

  if (highlights.length === 0) {
    return (
      <div className="border-2 border-border rounded-lg p-2 bg-card-bg flex flex-col gap-1.5">
        <span className="text-xs opacity-50 uppercase tracking-wide">This Week</span>
        <span className="text-sm opacity-40">Keep climbing — highlights build as the week goes</span>
      </div>
    );
  }

  if (compact) {
    const top = highlights[0];
    return (
      <div className="border-2 border-border rounded-lg p-2 bg-card-bg flex flex-col gap-1.5">
        <span className="text-xs opacity-50 uppercase tracking-wide">This Week</span>
        <div className="flex items-start gap-2">
          <Star size={14} weight="fill" className="mt-1 shrink-0" style={{ color: typeColors[top.type] }} />
          <span className="text-sm leading-snug">{top.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-border rounded-lg p-2 bg-card-bg flex-1">
      <span className="text-xs opacity-50 uppercase tracking-wide">This Week</span>
      <div className="flex flex-col gap-2 mt-2">
        {highlights.map((h, i) => (
          <div key={i} className="flex items-start gap-2">
            <span
              className="mt-1.5 w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: typeColors[h.type] }}
            />
            <span className="text-sm leading-snug">{h.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No new errors. Note: `Star` icon is from `@phosphor-icons/react` which is already a dependency.

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/highlights-card.tsx
git commit -m "feat: add HighlightsCard component with compact and full variants"
```

### Task 3: Integrate into log page (side by side)

**Files:**
- Modify: `src/routes/log.tsx:12,70` — add import, split top row

- [ ] **Step 1: Add import**

Add after the CoachCard import (line 12):
```typescript
import { HighlightsCard } from "../components/analytics/highlights-card";
```

- [ ] **Step 2: Replace the CoachCard line with a side-by-side row**

Replace line 70:
```typescript
      <CoachCard goalGrade={goalGrade} />
```

With:
```typescript
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <CoachCard goalGrade={goalGrade} />
        </div>
        <div className="flex-1 min-w-0">
          <HighlightsCard goalGrade={goalGrade} compact />
        </div>
      </div>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/log.tsx
git commit -m "feat: add compact highlights card alongside coach on log page"
```

### Task 4: Replace WeeklyZones on analytics page

**Files:**
- Modify: `src/routes/analytics.tsx:6,25-28` — swap import and usage

- [ ] **Step 1: Replace WeeklyZones import**

Replace line 6:
```typescript
import { WeeklyZones } from "../components/analytics/weekly-zones";
```

With:
```typescript
import { HighlightsCard } from "../components/analytics/highlights-card";
```

- [ ] **Step 2: Replace WeeklyZones usage**

Replace lines 25-28:
```typescript
      <div className="flex gap-1 items-stretch">
        <div className="flex-1 min-w-0 flex">
          <WeeklyZones goalGrade={goalGrade} />
        </div>
```

With:
```typescript
      <div className="flex gap-1 items-stretch">
        <div className="flex-1 min-w-0 flex">
          <HighlightsCard goalGrade={goalGrade} />
        </div>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors (the pre-existing weekly-zones TS errors should be gone since it's no longer imported).

- [ ] **Step 4: Commit**

```bash
git add src/routes/analytics.tsx
git commit -m "feat: replace WeeklyZones with HighlightsCard on analytics page"
```

### Task 5: Manual smoke test

- [ ] **Step 1: Run the dev server**

Run: `npx convex dev` (if not already running) and `npm run dev`

- [ ] **Step 2: Verify log page**

- Coach card and highlights card should sit side by side, each ~50% width
- Highlights card shows "This Week" title with a single star-icon highlight or fallback message

- [ ] **Step 3: Verify analytics page**

- "This Week" card should appear where Weekly Zones used to be, alongside Hold Type Ring
- Should show full list of highlights or fallback message
