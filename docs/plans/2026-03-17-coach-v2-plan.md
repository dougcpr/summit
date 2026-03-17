# Coach V2: Mirror + Nudge Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the periodization-based coach with a session-reactive "Mirror + Nudge" coach that gives fast, fundamentals-first feedback based on recent send rates.

**Architecture:** The `coachNudges` Convex query is rewritten to analyze the last 3 and 10 sessions (by distinct `climbedAt` dates) instead of calendar windows. Priority-ordered rules evaluate send rates per grade and surface actionable nudges. Pinch hold type is removed from the entire hold type system.

**Tech Stack:** Convex (backend queries), React/TypeScript (frontend components)

**Spec:** `docs/plans/2026-03-17-coach-v2-design.md`

---

## Chunk 1: Remove Pinch Hold Type

### Task 1: Remove pinch from grades lib

**Files:**
- Modify: `src/lib/grades.ts:40-47`

- [ ] **Step 1: Update HoldType and holdTypeConfig**

Remove pinch from the type and config:

```typescript
export type HoldType = "jug" | "crimp" | "sloper";

export const holdTypeConfig: Record<HoldType, { label: string; letter: string; color: string; bgColor: string }> = {
  jug: { label: "Jug", letter: "J", color: "var(--color-primary)", bgColor: "rgba(228, 196, 77, 0.35)" },
  crimp: { label: "Crimp", letter: "C", color: "var(--color-accent)", bgColor: "rgba(89, 149, 163, 0.35)" },
  sloper: { label: "Sloper", letter: "S", color: "var(--color-tertiary)", bgColor: "rgba(106, 153, 78, 0.35)" },
};
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Errors in files that reference `pinch` (hold-type-picker, climb-list, hold-type-ring, analytics.ts) — these are fixed in subsequent steps.

- [ ] **Step 3: Commit**

```bash
git add src/lib/grades.ts
git commit -m "refactor: remove pinch from HoldType and holdTypeConfig"
```

### Task 2: Remove pinch from UI components

**Files:**
- Modify: `src/components/log/hold-type-picker.tsx:10-15` — remove pinch from icons map
- Modify: `src/components/log/climb-list.tsx:7-12` — remove pinch from holdIcons map
- Modify: `src/components/analytics/hold-type-ring.tsx:7-12` — remove pinch from holdIcons map

- [ ] **Step 1: Update hold-type-picker.tsx**

Remove the `pinch: HandPointing` entry from the `icons` record (line 14) and remove the `HandPointing` import.

```typescript
import { HandGrabbing, Hand, HandPalm } from "@phosphor-icons/react";
// ...
const icons: Record<HoldType, React.ElementType> = {
  jug: HandGrabbing,
  crimp: Hand,
  sloper: HandPalm,
};
```

- [ ] **Step 2: Update climb-list.tsx**

Remove the `pinch: HandPointing` entry from `holdIcons` (line 11) and remove the `HandPointing` import.

```typescript
import { HandGrabbing, Hand, HandPalm, X } from "@phosphor-icons/react";
// ...
const holdIcons: Record<HoldType, React.ElementType> = {
  jug: HandGrabbing,
  crimp: Hand,
  sloper: HandPalm,
};
```

- [ ] **Step 3: Update hold-type-ring.tsx**

Remove the `pinch: HandPointing` entry from `holdIcons` (line 11) and remove the `HandPointing` import.

```typescript
import { HandGrabbing, Hand, HandPalm } from "@phosphor-icons/react";
// ...
const holdIcons: Record<HoldType, React.ElementType> = {
  jug: HandGrabbing,
  crimp: Hand,
  sloper: HandPalm,
};
```

- [ ] **Step 4: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Only errors from analytics.ts (fixed in next task).

- [ ] **Step 5: Commit**

```bash
git add src/components/log/hold-type-picker.tsx src/components/log/climb-list.tsx src/components/analytics/hold-type-ring.tsx
git commit -m "refactor: remove pinch from UI components"
```

### Task 3: Remove pinch from backend analytics

**Files:**
- Modify: `convex/analytics.ts:120-122` — `holdTypeBreakdown` query
- Modify: `convex/analytics.ts:431-432` — `coachNudges` hold type map

- [ ] **Step 1: Update holdTypeBreakdown query**

Change line 120-122 in `holdTypeBreakdown`:

```typescript
const sendsByHoldAndGrade: Record<string, Record<string, number>> = {
  jug: {}, crimp: {}, sloper: {},
};
```

- [ ] **Step 2: Update coachNudges hold type map**

Change line 431-432 in `coachNudges`:

```typescript
const sendsByHoldAndGrade: Record<string, Record<string, number>> = {
  jug: {}, crimp: {}, sloper: {},
};
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors (or only errors from unrelated files).

- [ ] **Step 4: Commit**

```bash
git add convex/analytics.ts
git commit -m "refactor: remove pinch from backend hold type queries"
```

---

## Chunk 2: Remove Periodization & Rewrite Coach Logic

### Task 4: Delete periodization helper functions

**Files:**
- Modify: `convex/analytics.ts:306-365` — delete `computeRestDays()` and `computeCyclePhase()`

These are standalone helper functions above the `coachNudges` query. Deleting them first keeps the diff clean. The `coachNudges` handler body is left untouched here — Task 6 replaces it entirely.

- [ ] **Step 1: Delete both helper functions**

Delete the `computeRestDays()` function (lines 306-327) and the `computeCyclePhase()` function (lines 329-365), including the `// --- Coach Nudges ---` comment on line 304.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Errors inside `coachNudges` handler (references to deleted functions) — fixed by Task 6 which replaces the entire handler.

- [ ] **Step 3: Commit**

```bash
git add convex/analytics.ts
git commit -m "refactor: delete computeRestDays and computeCyclePhase helpers"
```

### Task 5: Remove periodization from frontend

**Files:**
- Modify: `src/components/analytics/coach-card.tsx:5-25` — remove props, `isRest`, `onRestStatus`
- Modify: `src/routes/log.tsx:34,71-76,98` — remove `isRest` state, simplify CoachCard call, remove `isRest` from ClimbList

- [ ] **Step 1: Simplify CoachCard component**

Rewrite `coach-card.tsx`:

```typescript
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const dotColors: Record<string, string> = {
  balance: "var(--color-tertiary)",
  holds: "var(--color-secondary)",
  positive: "var(--color-accent)",
};

export function CoachCard({ goalGrade }: { goalGrade: string }) {
  const data = useQuery(api.analytics.coachNudges, { goalGrade });

  if (!data) return <div className="border-2 border-border rounded-lg p-2 bg-card-bg h-[4.5rem]" />;

  return (
    <div className="border-2 border-border rounded-lg p-2 bg-card-bg flex flex-col gap-1.5">
      <span className="text-xs opacity-50 uppercase tracking-wide">Coach</span>
      {data.nudges.map((nudge, i) => (
        <div key={i} className="flex items-start gap-2">
          <span
            className="mt-1.5 w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: dotColors[nudge.type] }}
          />
          <span className="text-sm leading-snug">{nudge.message}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Simplify log.tsx**

Remove `isRest` state (line 34): delete `const [isRest, setIsRest] = useState(false);`

Simplify CoachCard call (lines 71-76):
```typescript
<CoachCard goalGrade={goalGrade} />
```

Remove `isRest` prop from ClimbList (line 98):
```typescript
<ClimbList climbs={climbs ?? []} />
```

Remove `useState` from imports if no longer needed (it's still used for other state, so keep it).

- [ ] **Step 3: Remove `isRest` from ClimbList**

In `src/components/log/climb-list.tsx`:

Remove `isRest` from `ClimbListProps` interface (line 16):
```typescript
interface ClimbListProps {
  climbs: Doc<"climbs">[];
}
```

Update the function signature (line 48):
```typescript
export function ClimbList({ climbs }: ClimbListProps) {
```

Remove the rest-day empty state block (lines 49-55).

- [ ] **Step 4: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/analytics/coach-card.tsx src/routes/log.tsx src/components/log/climb-list.tsx
git commit -m "refactor: remove periodization props and isRest from frontend"
```

---

## Chunk 3: New Session-Reactive Coach Logic

### Task 6: Rewrite coachNudges with session-based analysis

**Files:**
- Modify: `convex/analytics.ts` — rewrite the `coachNudges` handler

After Task 4 deleted the helper functions and Task 5 cleaned up the frontend, the `coachNudges` query still has the old handler body (which has compile errors from the deleted helpers). This task replaces the entire `coachNudges` query with the new session-reactive logic — args, handler, and all.

- [ ] **Step 1: Rewrite the coachNudges handler**

Replace the entire `coachNudges` query with:

```typescript
export const coachNudges = query({
  args: {
    goalGrade: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const goalIdx = gradeIdx(args.goalGrade);
    if (goalIdx < 0) return { nudges: [] };

    const projectIdx = goalIdx - 1;
    const buildMaxIdx = goalIdx - 2;
    const buildMinIdx = Math.max(0, goalIdx - 3);

    // Fetch last 90 days of climbs
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const recentClimbs = await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("climbedAt", ninetyDaysAgo),
      )
      .collect();

    // Group by session (distinct climbedAt dates)
    const sessionMap = new Map<number, typeof recentClimbs>();
    for (const c of recentClimbs) {
      const existing = sessionMap.get(c.climbedAt) || [];
      existing.push(c);
      sessionMap.set(c.climbedAt, existing);
    }
    const sessionDates = [...sessionMap.keys()].sort((a, b) => b - a);

    if (sessionDates.length === 0) return { nudges: [] };

    // Short window: last 3 sessions
    const short3Dates = sessionDates.slice(0, 3);
    const short3Climbs = short3Dates.flatMap((d) => sessionMap.get(d)!);

    // Medium window: sessions 4-10 (baseline, excludes recent 3)
    const baselineDates = sessionDates.slice(3, 10);
    const baselineClimbs = baselineDates.flatMap((d) => sessionMap.get(d)!);

    // Helper: compute send rate for a grade range in a set of climbs
    function sendRateForRange(
      climbs: typeof recentClimbs,
      minIdx: number,
      maxIdx: number,
    ): { sends: number; total: number; rate: number } {
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

    // Helper: send rate for a single grade
    function sendRateForGrade(
      climbs: typeof recentClimbs,
      idx: number,
    ): { sends: number; total: number; rate: number } {
      return sendRateForRange(climbs, idx, idx);
    }

    const nudges: { message: string; type: string }[] = [];

    // --- Rule 1: Fatigue detection ---
    // Overall send rate drops 15+ points from baseline to recent 3
    const overallRecent = sendRateForRange(short3Climbs, 0, GRADES.length - 1);
    const overallBaseline = sendRateForRange(baselineClimbs, 0, GRADES.length - 1);
    if (
      overallBaseline.rate >= 0 &&
      overallRecent.rate >= 0 &&
      overallBaseline.rate - overallRecent.rate >= 15
    ) {
      nudges.push({
        message: `Send rates dropping across the board — consider a rest day or easy session`,
        type: "fatigue",
      });
    }

    // --- Rule 2: Grade overreach ---
    // Any build/project grade < 50% over last 3 sessions (min 3 attempts)
    if (nudges.length === 0) {
      for (let i = buildMinIdx; i <= projectIdx; i++) {
        const stats = sendRateForGrade(short3Climbs, i);
        if (stats.total >= 3 && stats.rate < 50) {
          nudges.push({
            message: `${GRADES[i]}s at ${stats.rate}% — focus on clean sends there before pushing up`,
            type: "overreach",
          });
          break;
        }
      }
    }

    // --- Rule 3: Regression alert ---
    // Grade was 70%+ over sessions 4-10, now < 50% in last 3
    if (nudges.length === 0 && baselineClimbs.length > 0) {
      for (let i = buildMinIdx; i <= projectIdx; i++) {
        const recent = sendRateForGrade(short3Climbs, i);
        const baseline = sendRateForGrade(baselineClimbs, i);
        if (
          baseline.total >= 3 &&
          baseline.rate >= 70 &&
          recent.total >= 3 &&
          recent.rate < 50
        ) {
          nudges.push({
            message: `${GRADES[i]} send rate dropped from ${baseline.rate}% to ${recent.rate}% — something's off, revisit those`,
            type: "regression",
          });
          break;
        }
      }
    }

    // --- Rule 4: Ready to push ---
    // All build grades at 70%+ over last 3 sessions (min 3 attempts each)
    if (nudges.length === 0) {
      let allSolid = true;
      for (let i = buildMinIdx; i <= buildMaxIdx; i++) {
        const stats = sendRateForGrade(short3Climbs, i);
        if (stats.total < 3 || stats.rate < 70) {
          allSolid = false;
          break;
        }
      }
      if (allSolid && buildMinIdx <= buildMaxIdx) {
        nudges.push({
          message: `${GRADES[projectIdx]}s looking smooth — try a ${GRADES[goalIdx]} when it feels right`,
          type: "push",
        });
      }
    }

    // --- Rule 5: Solid fallback ---
    if (nudges.length === 0) {
      const buildGrades =
        buildMinIdx === buildMaxIdx
          ? GRADES[buildMinIdx]
          : `${GRADES[buildMinIdx]}-${GRADES[buildMaxIdx]}`;
      nudges.push({
        message: `Base looks solid — keep building volume at ${buildGrades}`,
        type: "solid",
      });
    }

    // --- Secondary nudge: hold type ---
    const sendsByHoldAndGrade: Record<string, Record<string, number>> = {
      jug: {}, crimp: {}, sloper: {},
    };
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
        if (count >= 2 && idx > levelIdx) {
          levelIdx = idx;
          level = grade;
        }
      }
      return { type, level, levelIdx };
    });
    const weakestHold = holdGradeLevels.reduce((a, b) => (a.levelIdx < b.levelIdx ? a : b));

    if (weakestHold.level === "—") {
      nudges.push({
        message: `Get 3+ ${weakestHold.type} sends to establish a baseline`,
        type: "holds",
      });
    } else {
      nudges.push({
        message: `${weakestHold.type}s at ${weakestHold.level} — try a ${weakestHold.level} ${weakestHold.type} send`,
        type: "holds",
      });
    }

    return { nudges: nudges.slice(0, 2) };
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add convex/analytics.ts
git commit -m "feat: rewrite coachNudges with session-reactive mirror+nudge logic"
```

### Task 7: Update coach card dot colors

**Files:**
- Modify: `src/components/analytics/coach-card.tsx:5-9` — update `dotColors` map

- [ ] **Step 1: Update dotColors to new nudge types**

```typescript
const dotColors: Record<string, string> = {
  fatigue: "var(--color-secondary)",
  overreach: "var(--color-tertiary)",
  regression: "var(--color-tertiary)",
  push: "var(--color-accent)",
  solid: "var(--color-primary)",
  holds: "var(--color-secondary)",
};
```

Note: Using existing CSS variables — `secondary` for warning-ish (fatigue/holds), `tertiary` for caution (overreach/regression), `accent` for positive (push), `primary` for neutral (solid).

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/coach-card.tsx
git commit -m "feat: update coach dot colors for new nudge types"
```

---

## Chunk 4: Cleanup

### Task 8: Delete dead code

**Files:**
- Delete: `src/components/analytics/send-rate.tsx` — references non-existent `api.analytics.sendRates`, not imported anywhere
- Delete: `src/components/log/session-focus.tsx` — untracked file, not imported anywhere

- [ ] **Step 1: Delete dead files**

```bash
rm src/components/analytics/send-rate.tsx
rm src/components/log/session-focus.tsx
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add -u src/components/analytics/send-rate.tsx
git commit -m "chore: delete dead send-rate.tsx component"
```

### Task 9: Manual smoke test

- [ ] **Step 1: Run the dev server**

Run: `npx convex dev` (if not already running) and `npm run dev`

- [ ] **Step 2: Verify coach card**

Open the log page. The coach card should:
- Show 1-2 nudges with colored dots
- NOT show "Training week X of Y" or rest day messages
- Show session-reactive messages with specific percentages

- [ ] **Step 3: Verify hold type picker**

The hold type picker should show 3 options (jug, crimp, sloper) — no pinch.

- [ ] **Step 4: Verify hold type ring on analytics page**

The hold levels card should show 3 hold types — no pinch.
