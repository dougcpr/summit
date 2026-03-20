# Analytics Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate full table scans on analytics page loads by precomputing analytics results into a cache table, updated only when climbs change.

**Architecture:** Add an `analyticsCache` table keyed by `(userId, queryKey)`. Extract all computation logic into pure helper functions. Analytics queries read from cache (1 doc each). `climbs.add` and `climbs.remove` schedule an `internalMutation` that recomputes all cache entries for the user. A public `ensureCache` mutation lets the frontend trigger initial cache population.

**Tech Stack:** Convex (internalMutation, ctx.scheduler), TypeScript

---

## File Structure

| File | Responsibility |
|------|---------------|
| `convex/schema.ts` | Add `analyticsCache` table definition |
| `convex/analyticsHelpers.ts` | **NEW** — Pure computation functions extracted from analytics queries (no DB access) |
| `convex/analyticsCache.ts` | **NEW** — `internalMutation` to recompute + store all cache entries; public `ensureCache` mutation |
| `convex/analytics.ts` | Queries refactored to read from cache table, fallback to live computation |
| `convex/climbs.ts` | `add`/`remove` schedule cache recomputation via `ctx.scheduler` |

---

### Task 1: Add `analyticsCache` table to schema

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add the analyticsCache table definition**

```typescript
// Add after the notes table definition:
analyticsCache: defineTable({
  userId: v.string(),
  queryKey: v.string(),  // e.g. "pyramid:V5", "heatmapData", "holdTypeBreakdown:V5"
  result: v.string(),     // JSON-serialized query result
  updatedAt: v.number(),  // Date.now() when last recomputed
})
  .index("by_user_key", ["userId", "queryKey"])
  .index("by_user", ["userId"]),
```

- [ ] **Step 2: Verify Convex accepts the schema**

Run: `npx convex dev` (let it sync, check for errors)
Expected: Schema pushed successfully, no errors

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add analyticsCache table to schema"
```

---

### Task 2: Extract computation logic into pure helpers

This is the biggest task. Every analytics query's computation logic moves into a pure function that takes climbs as input and returns the result. No DB access in these functions.

**Files:**
- Create: `convex/analyticsHelpers.ts`
- Reference: `convex/analytics.ts` (copy logic from here)

- [ ] **Step 1: Create analyticsHelpers.ts with shared constants and utility functions**

```typescript
// convex/analyticsHelpers.ts

export const GRADES = ["V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10"];

export function gradeIdx(grade: string): number {
  return GRADES.indexOf(grade);
}

export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

// Type for a climb document (matches schema)
export type ClimbDoc = {
  grade: string;
  completed: boolean;
  holdType: string;
  climbedAt: number;
};
```

- [ ] **Step 2: Add `computePyramid` helper**

```typescript
export function computePyramid(climbs: ClimbDoc[], goalGrade: string) {
  const goalIdx = gradeIdx(goalGrade);
  if (goalIdx < 0) return { rows: [], weeksRemaining: 0 };

  const sendsByGrade: Record<string, number> = {};
  const attemptsByGrade: Record<string, number> = {};
  for (const c of climbs) {
    attemptsByGrade[c.grade] = (attemptsByGrade[c.grade] || 0) + 1;
    if (c.completed) {
      sendsByGrade[c.grade] = (sendsByGrade[c.grade] || 0) + 1;
    }
  }

  type PyramidRow = { label: string; sends: number; attempts: number; target: number; color: string };
  const rows: PyramidRow[] = [];

  for (let i = 0; i <= goalIdx; i++) {
    const stepsBelow = goalIdx - i;
    const target = stepsBelow === 0 ? 1 : Math.pow(2, stepsBelow + 1);
    rows.push({
      label: GRADES[i],
      sends: sendsByGrade[GRADES[i]] || 0,
      attempts: attemptsByGrade[GRADES[i]] || 0,
      target,
      color: GRADES[i],
    });
  }

  let weeksRemaining = 52;
  if (climbs.length > 0) {
    const firstClimb = climbs.reduce((a, b) => (a.climbedAt < b.climbedAt ? a : b));
    const elapsed = Date.now() - firstClimb.climbedAt;
    const weeksElapsed = Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000));
    weeksRemaining = Math.max(0, 52 - weeksElapsed);
  }

  return { rows: rows.reverse(), weeksRemaining };
}
```

- [ ] **Step 3: Add `computeHeatmapData` helper**

```typescript
export function computeHeatmapData(climbs: ClimbDoc[]) {
  const byDay: Record<string, { weightedSum: number; totalWeight: number }> = {};
  for (const c of climbs) {
    const d = new Date(c.climbedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const num = gradeIdx(c.grade);
    if (num >= 0) {
      if (!byDay[key]) byDay[key] = { weightedSum: 0, totalWeight: 0 };
      const weight = num + 1;
      byDay[key].weightedSum += num * weight;
      byDay[key].totalWeight += weight;
    }
  }

  return Object.entries(byDay).map(([date, { weightedSum, totalWeight }]) => ({
    date,
    count: Math.round(weightedSum / totalWeight) + 1,
  }));
}
```

- [ ] **Step 4: Add `computeHoldTypeBreakdown` helper**

Takes climbs already filtered to last 90 days.

```typescript
export function computeHoldTypeBreakdown(recentClimbs: ClimbDoc[], goalGrade: string) {
  const goalIdx = gradeIdx(goalGrade);
  const suggestedStartGrade = GRADES[Math.max(0, goalIdx - 3)] || "V0";

  const sendsByHoldAndGrade: Record<string, Record<string, number>> = {
    jug: {}, crimp: {}, sloper: {},
  };
  for (const c of recentClimbs) {
    const ht = c.holdType.toLowerCase();
    if (c.completed && ht in sendsByHoldAndGrade) {
      sendsByHoldAndGrade[ht][c.grade] = (sendsByHoldAndGrade[ht][c.grade] || 0) + 1;
    }
  }

  const types = Object.entries(sendsByHoldAndGrade).map(([type, grades]) => {
    let gradeLevel = "—";
    let gradeLevelIdx = -1;
    let bestSingleIdx = -1;
    let bestSingleGrade = "—";
    for (const [grade, count] of Object.entries(grades)) {
      const idx = gradeIdx(grade);
      if (count >= 2 && idx > gradeLevelIdx) {
        gradeLevelIdx = idx;
        gradeLevel = grade;
      }
      if (idx > bestSingleIdx) {
        bestSingleIdx = idx;
        bestSingleGrade = grade;
      }
    }
    if (gradeLevelIdx < 0 && bestSingleIdx >= 0) {
      gradeLevel = bestSingleGrade;
      gradeLevelIdx = bestSingleIdx;
    }
    if (gradeLevelIdx < 0) {
      gradeLevel = suggestedStartGrade;
      gradeLevelIdx = gradeIdx(suggestedStartGrade);
    }
    return { type, gradeLevel, gradeLevelIdx };
  });

  const weakest = types.reduce((a, b) => (a.gradeLevelIdx < b.gradeLevelIdx ? a : b));
  return { types, weakest: weakest.type };
}
```

- [ ] **Step 5: Add `computeWeeklyZones` helper**

Takes climbs already filtered to current week.

```typescript
export function computeWeeklyZones(weekClimbs: ClimbDoc[], goalGrade: string) {
  const goalIdx = gradeIdx(goalGrade);
  if (goalIdx < 0) return { zones: [], todayZone: "" };

  const projectIdx = goalIdx - 1;
  const buildMaxIdx = goalIdx - 2;
  const buildMinIdx = Math.max(0, goalIdx - 3);
  const warmupMaxIdx = Math.max(0, buildMinIdx - 1);

  function countZone(minIdx: number, maxIdx: number) {
    let sends = 0;
    let attempts = 0;
    for (const c of weekClimbs) {
      const gi = gradeIdx(c.grade);
      if (gi >= minIdx && gi <= maxIdx) {
        if (c.completed) sends++;
        else attempts++;
      }
    }
    return { sends, attempts };
  }

  const warmUp = countZone(0, warmupMaxIdx);
  const buildBase = countZone(buildMinIdx, buildMaxIdx);
  const project = countZone(projectIdx, projectIdx);
  const reach = countZone(goalIdx, GRADES.length - 1);

  const zones = [
    { label: "Warm Up", grade: `V0-${GRADES[warmupMaxIdx]}`, target: 8, ...warmUp, color: "accent" },
    { label: "Build Base", grade: `${GRADES[buildMinIdx]}-${GRADES[buildMaxIdx]}`, target: 6, ...buildBase, color: "tertiary" },
    { label: "Project", grade: GRADES[projectIdx] || "—", target: 3, attemptTarget: 8, ...project, color: "secondary" },
    { label: "Reach", grade: `${GRADES[goalIdx]}+`, target: 1, attemptTarget: 6, ...reach, color: "primary" },
  ];

  // NOTE: todayZone is NOT cached — it depends on the current day of week.
  // The query layer computes it at read time and merges it in.
  return { zones };
}

// Computed at query read time, not cached
export function computeTodayZone(): string {
  const dayOfWeek = new Date().getDay();
  return dayOfWeek === 1 || dayOfWeek === 4
    ? "Project"
    : dayOfWeek === 3 || dayOfWeek === 6
      ? "Build Base"
      : dayOfWeek === 5
        ? "Reach"
        : "Build Base";
}
```

- [ ] **Step 6: Add `computeTimelineMilestones` helper**

```typescript
export function computeTimelineMilestones(climbs: ClimbDoc[], goalGrade: string) {
  if (climbs.length === 0) return null;

  const sorted = [...climbs].sort((a, b) => a.climbedAt - b.climbedAt);
  const startDate = sorted[0].climbedAt;
  const endDate = startDate + 52 * 7 * 24 * 60 * 60 * 1000;
  const goalGi = gradeIdx(goalGrade);

  const firstSends: { grade: string; date: number }[] = [];
  const sendCounts: Record<string, number> = {};
  const recorded = new Set<string>();
  for (const c of sorted) {
    if (c.completed && !recorded.has(c.grade)) {
      sendCounts[c.grade] = (sendCounts[c.grade] || 0) + 1;
      if (sendCounts[c.grade] >= 3) {
        recorded.add(c.grade);
        const gi = gradeIdx(c.grade);
        if (gi >= 0 && gi <= goalGi) {
          firstSends.push({ grade: c.grade, date: c.climbedAt });
        }
      }
    }
  }

  const gaps: { start: number; end: number }[] = [];
  const GAP_THRESHOLD = 14 * 24 * 60 * 60 * 1000;
  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i].climbedAt - sorted[i - 1].climbedAt;
    if (diff >= GAP_THRESHOLD) {
      gaps.push({ start: sorted[i - 1].climbedAt, end: sorted[i].climbedAt });
    }
  }

  // NOTE: `now` is NOT cached — the query layer adds it at read time.
  return { startDate, endDate, firstSends, gaps };
}
```

- [ ] **Step 7: Add `computeHoldTypeTimelines` helper**

```typescript
export function computeHoldTypeTimelines(climbs: ClimbDoc[], goalGrade: string) {
  if (climbs.length === 0) return null;

  const sorted = [...climbs].sort((a, b) => a.climbedAt - b.climbedAt);
  const startDate = sorted[0].climbedAt;
  const endDate = startDate + 52 * 7 * 24 * 60 * 60 * 1000;
  const goalGi = gradeIdx(goalGrade);

  const holdTypes = ["jug", "crimp", "sloper"] as const;
  const timelines = holdTypes.map((ht) => {
    const milestones: { grade: string; date: number }[] = [];
    const sendCounts: Record<string, number> = {};
    const recorded = new Set<string>();

    for (const c of sorted) {
      if (c.completed && c.holdType.toLowerCase() === ht && !recorded.has(c.grade)) {
        sendCounts[c.grade] = (sendCounts[c.grade] || 0) + 1;
        if (sendCounts[c.grade] >= 3) {
          recorded.add(c.grade);
          const gi = gradeIdx(c.grade);
          if (gi >= 0 && gi <= goalGi) {
            milestones.push({ grade: c.grade, date: c.climbedAt });
          }
        }
      }
    }

    return { holdType: ht, milestones };
  });

  // NOTE: `now` is NOT cached — the query layer adds it at read time.
  return { startDate, endDate, timelines };
}
```

- [ ] **Step 8: Add `computeCoachNudges` helper**

Takes climbs already filtered to last 90 days.

```typescript
export function computeCoachNudges(recentClimbs: ClimbDoc[], goalGrade: string) {
  const goalIdx = gradeIdx(goalGrade);
  if (goalIdx < 0) return { nudges: [] };

  const projectIdx = goalIdx - 1;
  const buildMaxIdx = goalIdx - 2;
  const buildMinIdx = Math.max(0, goalIdx - 3);

  // Group by session (distinct climbedAt dates)
  const sessionMap = new Map<number, ClimbDoc[]>();
  for (const c of recentClimbs) {
    const existing = sessionMap.get(c.climbedAt) || [];
    existing.push(c);
    sessionMap.set(c.climbedAt, existing);
  }
  const sessionDates = [...sessionMap.keys()].sort((a, b) => b - a);

  if (sessionDates.length === 0) return { nudges: [] };

  const short3Dates = sessionDates.slice(0, 3);
  const short3Climbs = short3Dates.flatMap((d) => sessionMap.get(d)!);
  const baselineDates = sessionDates.slice(3, 10);
  const baselineClimbs = baselineDates.flatMap((d) => sessionMap.get(d)!);

  function sendRateForRange(climbs: ClimbDoc[], minIdx: number, maxIdx: number) {
    let sends = 0;
    let total = 0;
    for (const c of climbs) {
      const gi = gradeIdx(c.grade);
      if (gi >= minIdx && gi <= maxIdx) {
        total++;
        if (c.completed) sends++;
      }
    }
    return { sends, total, rate: total > 0 ? Math.round((sends / total) * 100) : -1 };
  }

  function sendRateForGrade(climbs: ClimbDoc[], idx: number) {
    return sendRateForRange(climbs, idx, idx);
  }

  const nudges: { message: string; type: string }[] = [];

  // Rule 1: Fatigue
  const overallRecent = sendRateForRange(short3Climbs, 0, GRADES.length - 1);
  const overallBaseline = sendRateForRange(baselineClimbs, 0, GRADES.length - 1);
  if (overallBaseline.rate >= 0 && overallRecent.rate >= 0 && overallBaseline.rate - overallRecent.rate >= 15) {
    nudges.push({ message: `Send rates dropping across the board — consider a rest day or easy session`, type: "fatigue" });
  }

  // Rule 2: Overreach
  if (nudges.length === 0) {
    for (let i = buildMinIdx; i <= projectIdx; i++) {
      const stats = sendRateForGrade(short3Climbs, i);
      if (stats.total >= 3 && stats.rate < 50) {
        nudges.push({ message: `${GRADES[i]}s at ${stats.rate}% — focus on clean sends there before pushing up`, type: "overreach" });
        break;
      }
    }
  }

  // Rule 3: Regression
  if (nudges.length === 0 && baselineClimbs.length > 0) {
    for (let i = buildMinIdx; i <= projectIdx; i++) {
      const recent = sendRateForGrade(short3Climbs, i);
      const baseline = sendRateForGrade(baselineClimbs, i);
      if (baseline.total >= 3 && baseline.rate >= 70 && recent.total >= 3 && recent.rate < 50) {
        nudges.push({ message: `${GRADES[i]} send rate dropped from ${baseline.rate}% to ${recent.rate}% — something's off, revisit those`, type: "regression" });
        break;
      }
    }
  }

  // Rule 4: Ready to push
  if (nudges.length === 0) {
    let allSolid = true;
    for (let i = buildMinIdx; i <= buildMaxIdx; i++) {
      const stats = sendRateForGrade(short3Climbs, i);
      if (stats.total < 3 || stats.rate < 70) { allSolid = false; break; }
    }
    if (allSolid && buildMinIdx <= buildMaxIdx) {
      nudges.push({ message: `${GRADES[projectIdx]}s looking smooth — try a ${GRADES[goalIdx]} when it feels right`, type: "push" });
    }
  }

  // Rule 5: Solid fallback
  if (nudges.length === 0) {
    const buildGrades = buildMinIdx === buildMaxIdx ? GRADES[buildMinIdx] : `${GRADES[buildMinIdx]}-${GRADES[buildMaxIdx]}`;
    nudges.push({ message: `Base looks solid — keep building volume at ${buildGrades}`, type: "solid" });
  }

  // Secondary: hold type
  const sendsByHoldAndGrade: Record<string, Record<string, number>> = { jug: {}, crimp: {}, sloper: {} };
  for (const c of short3Climbs) {
    const ht = c.holdType.toLowerCase();
    if (c.completed && ht in sendsByHoldAndGrade) {
      sendsByHoldAndGrade[ht][c.grade] = (sendsByHoldAndGrade[ht][c.grade] || 0) + 1;
    }
  }
  const holdGradeLevels = Object.entries(sendsByHoldAndGrade).map(([type, grades]) => {
    let levelIdx = -1;
    let level = "—";
    for (const [grade, count] of Object.entries(grades)) {
      const idx = gradeIdx(grade);
      if (count >= 2 && idx > levelIdx) { levelIdx = idx; level = grade; }
    }
    return { type, level, levelIdx };
  });
  const weakestHold = holdGradeLevels.reduce((a, b) => (a.levelIdx < b.levelIdx ? a : b));
  const suggestGrade = GRADES[buildMinIdx];
  if (weakestHold.level === "—") {
    nudges.push({ message: `No ${weakestHold.type} baseline yet — try ${suggestGrade} ${weakestHold.type}s`, type: "holds" });
  } else {
    const suggestIdx = Math.min(weakestHold.levelIdx + 1, buildMaxIdx);
    nudges.push({ message: `${weakestHold.type}s weakest at ${weakestHold.level} — work ${GRADES[suggestIdx]} ${weakestHold.type}s`, type: "holds" });
  }

  return { nudges: nudges.slice(0, 2) };
}
```

- [ ] **Step 9: Add `computeWeeklyHighlights` helper**

Takes all climbs (needed for milestone detection).

```typescript
export function computeWeeklyHighlights(allClimbs: ClimbDoc[], goalGrade: string) {
  const goalIdx = gradeIdx(goalGrade);
  if (goalIdx < 0) return { highlights: [] };

  const projectIdx = goalIdx - 1;
  const buildMinIdx = Math.max(0, goalIdx - 3);

  const now = new Date();
  const thisWeekStart = getStartOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const thisWeekClimbs = allClimbs.filter((c) => c.climbedAt >= thisWeekStart.getTime());
  const lastWeekClimbs = allClimbs.filter(
    (c) => c.climbedAt >= lastWeekStart.getTime() && c.climbedAt < thisWeekStart.getTime(),
  );
  const beforeThisWeek = allClimbs.filter((c) => c.climbedAt < thisWeekStart.getTime());

  const highlights: { message: string; type: "milestone" | "holdup" | "sendrate" }[] = [];

  // Priority 1: Grade consistency milestones
  const sendsBeforeThisWeek: Record<string, number> = {};
  for (const c of beforeThisWeek) {
    if (c.completed) sendsBeforeThisWeek[c.grade] = (sendsBeforeThisWeek[c.grade] || 0) + 1;
  }
  const sendsThisWeek: Record<string, number> = {};
  for (const c of thisWeekClimbs) {
    if (c.completed) sendsThisWeek[c.grade] = (sendsThisWeek[c.grade] || 0) + 1;
  }
  for (let i = GRADES.length - 1; i >= 0; i--) {
    const grade = GRADES[i];
    const before = sendsBeforeThisWeek[grade] || 0;
    const thisWeek = sendsThisWeek[grade] || 0;
    if (before < 3 && before + thisWeek >= 3) {
      highlights.push({ message: `${grade} locked in — 3 consistent sends`, type: "milestone" });
    }
  }

  // Priority 2: Hold type improvement
  const holdTypes = ["jug", "crimp", "sloper"];
  function highestHoldLevel(climbs: ClimbDoc[], holdType: string): number {
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
      highlights.push({ message: `${GRADES[thisLevel]} ${ht}s feeling solid!`, type: "holdup" });
    }
  }

  // Priority 3: Send rate improvement
  for (let i = buildMinIdx; i <= projectIdx; i++) {
    const grade = GRADES[i];
    let twSends = 0, twTotal = 0, lwSends = 0, lwTotal = 0;
    for (const c of thisWeekClimbs) {
      if (c.grade === grade) { twTotal++; if (c.completed) twSends++; }
    }
    for (const c of lastWeekClimbs) {
      if (c.grade === grade) { lwTotal++; if (c.completed) lwSends++; }
    }
    if (twTotal >= 3 && lwTotal >= 3) {
      const twRate = Math.round((twSends / twTotal) * 100);
      const lwRate = Math.round((lwSends / lwTotal) * 100);
      if (twRate - lwRate >= 10) {
        highlights.push({ message: `${grade} send rate: ${lwRate}% → ${twRate}%`, type: "sendrate" });
      }
    }
  }

  return { highlights };
}
```

- [ ] **Step 10: Commit**

```bash
git add convex/analyticsHelpers.ts
git commit -m "refactor: extract analytics computation into pure helper functions"
```

---

### Task 3: Create the cache recomputation module

**Files:**
- Create: `convex/analyticsCache.ts`

- [ ] **Step 1: Create analyticsCache.ts with internal recompute mutation**

This mutation fetches all climbs once, runs all computations, and upserts cache entries. It's called via `ctx.scheduler` from climb mutations.

```typescript
// convex/analyticsCache.ts
import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  computePyramid,
  computeHeatmapData,
  computeHoldTypeBreakdown,
  computeWeeklyZones,
  computeTimelineMilestones,
  computeHoldTypeTimelines,
  computeCoachNudges,
  computeWeeklyHighlights,
  getStartOfWeek,
  type ClimbDoc,
} from "./analyticsHelpers";

async function upsertCache(
  ctx: { db: any },
  userId: string,
  queryKey: string,
  result: unknown,
) {
  const existing = await ctx.db
    .query("analyticsCache")
    .withIndex("by_user_key", (q: any) => q.eq("userId", userId).eq("queryKey", queryKey))
    .unique();

  const serialized = JSON.stringify(result);
  if (existing) {
    await ctx.db.patch(existing._id, { result: serialized, updatedAt: Date.now() });
  } else {
    await ctx.db.insert("analyticsCache", {
      userId,
      queryKey,
      result: serialized,
      updatedAt: Date.now(),
    });
  }
}

export const recompute = internalMutation({
  args: { userId: v.string(), goalGrade: v.string() },
  handler: async (ctx, args) => {
    const { userId, goalGrade } = args;

    // Clean up any old cache entries for this user (handles goalGrade changes)
    const oldEntries = await ctx.db
      .query("analyticsCache")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    for (const entry of oldEntries) {
      await ctx.db.delete(entry._id);
    }

    // Single fetch of all climbs
    const allClimbs: ClimbDoc[] = (
      await ctx.db
        .query("climbs")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .collect()
    ).map((c: any) => ({
      grade: c.grade,
      completed: c.completed,
      holdType: c.holdType,
      climbedAt: c.climbedAt,
    }));

    // Time-filtered subsets
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const recentClimbs = allClimbs.filter((c) => c.climbedAt >= ninetyDaysAgo);
    const weekStart = getStartOfWeek(new Date());
    const weekClimbs = allClimbs.filter((c) => c.climbedAt >= weekStart.getTime());

    // Compute all analytics from the single fetch
    await upsertCache(ctx, userId, `pyramid:${goalGrade}`, computePyramid(allClimbs, goalGrade));
    await upsertCache(ctx, userId, "heatmapData", computeHeatmapData(allClimbs));
    await upsertCache(ctx, userId, `holdTypeBreakdown:${goalGrade}`, computeHoldTypeBreakdown(recentClimbs, goalGrade));
    await upsertCache(ctx, userId, `weeklyZones:${goalGrade}`, computeWeeklyZones(weekClimbs, goalGrade));
    await upsertCache(ctx, userId, `timelineMilestones:${goalGrade}`, computeTimelineMilestones(allClimbs, goalGrade));
    await upsertCache(ctx, userId, `holdTypeTimelines:${goalGrade}`, computeHoldTypeTimelines(allClimbs, goalGrade));
    await upsertCache(ctx, userId, `coachNudges:${goalGrade}`, computeCoachNudges(recentClimbs, goalGrade));
    await upsertCache(ctx, userId, `weeklyHighlights:${goalGrade}`, computeWeeklyHighlights(allClimbs, goalGrade));
  },
});

// Public mutation: frontend calls this on analytics page load to ensure cache exists
export const ensureCache = mutation({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.tokenIdentifier;

    // Check if cache exists for this specific goalGrade (handles grade changes)
    const existing = await ctx.db
      .query("analyticsCache")
      .withIndex("by_user_key", (q) =>
        q.eq("userId", userId).eq("queryKey", `pyramid:${args.goalGrade}`),
      )
      .unique();

    if (!existing) {
      // No cache for this goalGrade — schedule recomputation
      await ctx.scheduler.runAfter(0, internal.analyticsCache.recompute, {
        userId,
        goalGrade: args.goalGrade,
      });
    }
  },
});
```

- [ ] **Step 2: Verify it compiles**

Run: `npx convex dev` (let it sync)
Expected: No type errors, functions registered

- [ ] **Step 3: Commit**

```bash
git add convex/analyticsCache.ts
git commit -m "feat: add analytics cache recomputation module"
```

---

### Task 4: Wire climb mutations to trigger cache recomputation

**Files:**
- Modify: `convex/climbs.ts`

- [ ] **Step 1: Import internal API and add scheduler calls to `add` and `remove`**

The key challenge: mutations don't know the user's `goalGrade`. We solve this by reading existing cache entries to find which goalGrade was last used, falling back to "V5".

```typescript
// At top of convex/climbs.ts, add:
import { internal } from "./_generated/api";

// In the `add` mutation handler, after the insert, add:
    // Schedule analytics cache recomputation
    const cachedEntry = await ctx.db
      .query("analyticsCache")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    // Extract goalGrade from existing cache key, or default to V5
    let goalGrade = "V5";
    if (cachedEntry) {
      const parts = cachedEntry.queryKey.split(":");
      if (parts.length > 1) goalGrade = parts[1];
    }
    await ctx.scheduler.runAfter(0, internal.analyticsCache.recompute, { userId, goalGrade });

// In the `remove` mutation handler, after the delete, add the same block:
    const cachedEntry = await ctx.db
      .query("analyticsCache")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    let goalGrade = "V5";
    if (cachedEntry) {
      const parts = cachedEntry.queryKey.split(":");
      if (parts.length > 1) goalGrade = parts[1];
    }
    await ctx.scheduler.runAfter(0, internal.analyticsCache.recompute, { userId, goalGrade });
```

- [ ] **Step 2: Verify it compiles and syncs**

Run: `npx convex dev`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add convex/climbs.ts
git commit -m "feat: trigger analytics cache recompute on climb add/remove"
```

---

### Task 5: Refactor analytics queries to read from cache

**Files:**
- Modify: `convex/analytics.ts`

The queries now read from the cache table first. If cache exists, return parsed result. If not, fall back to live computation (handles the case before cache is populated).

- [ ] **Step 1: Add cache-reading helper and import helpers at top of analytics.ts**

Replace the top of `convex/analytics.ts`:

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
import {
  GRADES,
  gradeIdx,
  computePyramid,
  computeHeatmapData,
  computeHoldTypeBreakdown,
  computeWeeklyZones,
  computeTimelineMilestones,
  computeHoldTypeTimelines,
  computeCoachNudges,
  computeWeeklyHighlights,
  computeTodayZone,
  getStartOfWeek,
} from "./analyticsHelpers";

async function getUserId(ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.tokenIdentifier;
}

// Returns { hit: true, value } on cache hit (value may be null for queries that return null),
// or { hit: false } on cache miss. This distinguishes "cached null" from "no cache entry".
async function readCache(ctx: { db: any }, userId: string, queryKey: string): Promise<{ hit: true; value: unknown } | { hit: false }> {
  const entry = await ctx.db
    .query("analyticsCache")
    .withIndex("by_user_key", (q: any) => q.eq("userId", userId).eq("queryKey", queryKey))
    .unique();
  if (entry) return { hit: true, value: JSON.parse(entry.result) };
  return { hit: false };
}
```

- [ ] **Step 2: Refactor `pyramid` query**

```typescript
export const pyramid = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const cached = await readCache(ctx, userId, `pyramid:${args.goalGrade}`);
    if (cached.hit) return cached.value;

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    return computePyramid(climbs, args.goalGrade);
  },
});
```

- [ ] **Step 3: Refactor `heatmapData` query**

```typescript
export const heatmapData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const cached = await readCache(ctx, userId, "heatmapData");
    if (cached.hit) return cached.value;

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    return computeHeatmapData(climbs);
  },
});
```

- [ ] **Step 4: Refactor `holdTypeBreakdown` query**

```typescript
export const holdTypeBreakdown = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const cached = await readCache(ctx, userId, `holdTypeBreakdown:${args.goalGrade}`);
    if (cached.hit) return cached.value;

    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q: any) => q.eq("userId", userId).gte("climbedAt", ninetyDaysAgo))
      .collect();
    return computeHoldTypeBreakdown(climbs, args.goalGrade);
  },
});
```

- [ ] **Step 5: Refactor `weeklyZones` query**

`todayZone` is computed at read time (not cached) since it depends on the current day.

```typescript
export const weeklyZones = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const cached = await readCache(ctx, userId, `weeklyZones:${args.goalGrade}`);
    if (cached.hit) {
      // Add todayZone at read time (not cached — depends on current day)
      const value = cached.value as { zones: unknown[] };
      return { ...value, todayZone: computeTodayZone() };
    }

    const weekStart = getStartOfWeek(new Date());
    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q: any) => q.eq("userId", userId).gte("climbedAt", weekStart.getTime()))
      .collect();
    const result = computeWeeklyZones(climbs, args.goalGrade);
    return { ...result, todayZone: computeTodayZone() };
  },
});
```

- [ ] **Step 6: Refactor `timelineMilestones` query**

`now` is computed at read time (not cached).

```typescript
export const timelineMilestones = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const cached = await readCache(ctx, userId, `timelineMilestones:${args.goalGrade}`);
    if (cached.hit) {
      if (cached.value === null) return null;
      return { ...(cached.value as object), now: Date.now() };
    }

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    const result = computeTimelineMilestones(climbs, args.goalGrade);
    return result ? { ...result, now: Date.now() } : null;
  },
});
```

- [ ] **Step 7: Refactor `holdTypeTimelines` query**

`now` is computed at read time (not cached).

```typescript
export const holdTypeTimelines = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const cached = await readCache(ctx, userId, `holdTypeTimelines:${args.goalGrade}`);
    if (cached.hit) {
      if (cached.value === null) return null;
      return { ...(cached.value as object), now: Date.now() };
    }

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    const result = computeHoldTypeTimelines(climbs, args.goalGrade);
    return result ? { ...result, now: Date.now() } : null;
  },
});
```

- [ ] **Step 8: Refactor `coachNudges` query**

```typescript
export const coachNudges = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const cached = await readCache(ctx, userId, `coachNudges:${args.goalGrade}`);
    if (cached.hit) return cached.value;

    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q: any) => q.eq("userId", userId).gte("climbedAt", ninetyDaysAgo))
      .collect();
    return computeCoachNudges(climbs, args.goalGrade);
  },
});
```

- [ ] **Step 9: Refactor `weeklyHighlights` query**

```typescript
export const weeklyHighlights = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const cached = await readCache(ctx, userId, `weeklyHighlights:${args.goalGrade}`);
    if (cached.hit) return cached.value;

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    return computeWeeklyHighlights(climbs, args.goalGrade);
  },
});
```

- [ ] **Step 10: Remove now-unused local helper functions from analytics.ts**

Delete the old `GRADES`, `gradeIdx`, `getStartOfWeek` constants/functions from the top of the file (they're now imported from analyticsHelpers).

- [ ] **Step 11: Commit**

```bash
git add convex/analytics.ts
git commit -m "refactor: analytics queries read from cache with live fallback"
```

---

### Task 6: Add `ensureCache` call to frontend analytics page

**Files:**
- Modify: `src/routes/analytics.tsx`

- [ ] **Step 1: Add ensureCache mutation call on analytics page mount**

```typescript
// Merge useMutation into existing convex/react import:
import { useQuery, useMutation } from "convex/react";

// Inside the analytics component, add:
const ensureCache = useMutation(api.analyticsCache.ensureCache);

// Call on mount and when goalGrade changes:
useEffect(() => {
  ensureCache({ goalGrade });
}, [goalGrade]);
```

Note: `ensureCache` checks if cache exists for this specific `goalGrade`. If not (first visit or grade changed), it schedules a background recompute. Meanwhile, queries fall back to live computation. The `goalGrade` variable should already be available in this component.

- [ ] **Step 2: Verify the app loads without errors**

Run: `npm run dev` and navigate to the analytics page
Expected: Page loads, data appears (may be slightly delayed on first load as cache populates)

- [ ] **Step 3: Commit**

```bash
git add src/routes/analytics.tsx
git commit -m "feat: trigger analytics cache population on page load"
```

---

### Task 7: Verify end-to-end and clean up

- [ ] **Step 1: Test the full flow**

1. Open the analytics page — data should load (cache miss → live fallback → cache populates async)
2. Log a new climb — analytics should update shortly after (cache recomputed via scheduler)
3. Reload the analytics page — data loads instantly from cache (no full table scan)
4. Delete a climb — analytics should update shortly after

- [ ] **Step 2: Verify bandwidth reduction**

Check the Convex dashboard for document read counts. Analytics queries should now read 1 doc each from `analyticsCache` instead of scanning all climbs.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: analytics caching complete"
```
