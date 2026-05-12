# Fingerboard Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third "FB" action button on the Log page that logs fingerboard training sessions for the selected date, with an FB chip for one-tap removal and graphite dot-pattern treatment showing session counts on the Year Calendar.

**Architecture:** New Convex `trainingSessions` table with a discriminated `type` union (currently `"fingerboard"`, extensible to `"weights"` later). Mutations/queries in `convex/training.ts` mirror the climbs API. A new `trainingByDate` query in `convex/analytics.ts` powers the Year Calendar. UI changes touch `ActionButtons`, `ClimbList`, `YearCalendar`, and the `/log` + `/journey` route handlers.

**Tech Stack:** Convex (backend + reactive queries), React 19, TypeScript, TanStack Router, Tailwind v4, Phosphor Icons.

**Verification convention:** This project has no automated test suite (no `test` script in `package.json` — only `lint` and `build`). Each task that changes code ends with manual verification: type-checks via `pnpm build` for the relevant files and/or a manual browser check on `pnpm dev`. Commit after each task.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `convex/schema.ts` | Modify | Add `trainingSessions` table definition |
| `convex/training.ts` | Create | `getByDate`, `add`, `remove` mutations/queries |
| `convex/analytics.ts` | Modify | Add `trainingByDate` query (un-cached) |
| `src/components/log/action-buttons.tsx` | Modify | Add third FB button alongside Attempt/Send |
| `src/components/log/climb-list.tsx` | Modify | Accept training sessions; render FB chip after climb chips |
| `src/routes/log.tsx` | Modify | Wire up training query/mutation and pass through to children |
| `src/components/analytics/year-calendar.tsx` | Modify | Accept training data; render dot pattern + corner count |
| `src/routes/journey.tsx` | Modify | Read `trainingByDate` and pass to `YearCalendar` |

---

## Task 1: Add `trainingSessions` table to schema

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add the table to the schema**

Open `convex/schema.ts`. Inside the `defineSchema({...})` object, after the `projectMoves` table definition (after line 58), add a comma and then this new table:

```ts
  trainingSessions: defineTable({
    userId: v.string(),
    type: v.union(v.literal("fingerboard")),
    trainedAt: v.number(),
  }).index("by_user_date", ["userId", "trainedAt"]),
```

The full table block in context (final structure):

```ts
  projectMoves: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
    order: v.number(),
    x: v.number(),
    y: v.number(),
    state: v.union(
      v.literal("todo"),
      v.literal("working"),
      v.literal("done"),
    ),
    vocabTags: v.array(v.string()),
    notes: v.string(),
  }).index("by_project", ["projectId"]),

  trainingSessions: defineTable({
    userId: v.string(),
    type: v.union(v.literal("fingerboard")),
    trainedAt: v.number(),
  }).index("by_user_date", ["userId", "trainedAt"]),
});
```

- [ ] **Step 2: Type-check**

Run: `pnpm build`

Expected: build succeeds. (Convex generated types update automatically when `convex dev` is running; if not running, the build will still succeed because no callers reference the new table yet.)

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(training): add trainingSessions table to schema"
```

---

## Task 2: Create `convex/training.ts` with backend mutations and queries

**Files:**
- Create: `convex/training.ts`

- [ ] **Step 1: Create the file**

Create `convex/training.ts` with this exact content:

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function getUserId(ctx: {
  auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.tokenIdentifier;
}

export const getByDate = query({
  args: {
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    return await ctx.db
      .query("trainingSessions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("trainedAt", args.startTime).lt("trainedAt", args.endTime),
      )
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    type: v.union(v.literal("fingerboard")),
    trainedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    return await ctx.db.insert("trainingSessions", { ...args, userId });
  },
});

export const remove = mutation({
  args: { id: v.id("trainingSessions") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
```

Why no `scheduler.runAfter(... analyticsCache.recompute ...)` like climbs has: training sessions do not feed the pyramid, hold-type analytics, or goal-grade calculations. They only feed the new (un-cached) `trainingByDate` query.

- [ ] **Step 2: Type-check**

Run: `pnpm build`

Expected: build succeeds. The Convex generated API (`@convex/_generated/api`) will now include `api.training.getByDate`, `api.training.add`, `api.training.remove`.

- [ ] **Step 3: Commit**

```bash
git add convex/training.ts
git commit -m "feat(training): add getByDate, add, remove for trainingSessions"
```

---

## Task 3: Add `trainingByDate` query to `convex/analytics.ts`

**Files:**
- Modify: `convex/analytics.ts`

- [ ] **Step 1: Append the new query**

At the end of `convex/analytics.ts` (after the `holdTypeTimelines` export), append:

```ts
// --- Training Sessions By Date (for Year Calendar) ---

export const trainingByDate = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const sessions = await ctx.db
      .query("trainingSessions")
      .withIndex("by_user_date", (q: any) => q.eq("userId", userId))
      .collect();

    const counts: Record<string, number> = {};
    for (const s of sessions) {
      const d = new Date(s.trainedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      counts[key] = (counts[key] || 0) + 1;
    }

    return Object.entries(counts).map(([date, count]) => ({ date, count }));
  },
});
```

This query is intentionally **not** cached via `analyticsCache` — training data is small (a few rows per rest day) and changes when the user logs/unlogs sessions; the cache invalidation plumbing would be more code than the query saves.

- [ ] **Step 2: Type-check**

Run: `pnpm build`

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add convex/analytics.ts
git commit -m "feat(analytics): add trainingByDate query for Year Calendar"
```

---

## Task 4: Add third FB button to `ActionButtons`

**Files:**
- Modify: `src/components/log/action-buttons.tsx`

- [ ] **Step 1: Replace the component to accept an `onFingerboard` handler and render the third button**

Replace the entire contents of `src/components/log/action-buttons.tsx` with:

```tsx
import { Plus, Check } from "@phosphor-icons/react";

interface ActionButtonsProps {
  onAttempt: () => void;
  onSend: () => void;
  onFingerboard: () => void;
  disabled?: boolean;
}

export function ActionButtons({ onAttempt, onSend, onFingerboard, disabled }: ActionButtonsProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onAttempt}
        disabled={disabled}
        className="flex-1 flex items-center justify-center py-4 text-border rounded-lg active:brightness-90 disabled:opacity-30 disabled:active:brightness-100"
        style={{ backgroundColor: "#d96c4f" }}
      >
        <Plus size={32} weight="bold" />
      </button>
      <button
        onClick={onSend}
        disabled={disabled}
        className="flex-1 flex items-center justify-center py-4 bg-primary text-border rounded-lg active:brightness-90 disabled:opacity-30 disabled:active:brightness-100"
      >
        <Check size={32} weight="bold" />
      </button>
      <button
        onClick={onFingerboard}
        disabled={disabled}
        className="flex-1 flex items-center justify-center py-4 text-white rounded-lg active:brightness-90 disabled:opacity-30 disabled:active:brightness-100 font-display font-bold text-2xl"
        style={{ backgroundColor: "#4a4a52" }}
      >
        FB
      </button>
    </div>
  );
}
```

Notes:
- `text-2xl` (~24px) was chosen to match the visual weight of the `size={32}` Phosphor icons used on the other buttons. Adjust to `text-xl` if it reads as oversized in the browser.
- `font-display` ensures the project's display font is applied (same font used elsewhere, e.g. climb chips).

- [ ] **Step 2: Type-check**

Run: `pnpm build`

Expected: build fails because `src/routes/log.tsx` still calls `<ActionButtons>` without an `onFingerboard` prop. This is expected — Task 5 fixes the call site. (If you want a clean intermediate build, jump to Task 5 first and commit them together; otherwise commit now and move on.)

- [ ] **Step 3: Commit**

```bash
git add src/components/log/action-buttons.tsx
git commit -m "feat(log): add fingerboard button to ActionButtons"
```

---

## Task 5: Wire up training query and FB handler in `/log` route

**Files:**
- Modify: `src/routes/log.tsx`

- [ ] **Step 1: Add training imports and hooks**

In `src/routes/log.tsx`, the existing import line:

```tsx
import { api } from "@convex/_generated/api";
```

Already covers `api.training`. No new imports needed.

Inside the `LogPage` component, after the existing climbs hooks (around line 36-37):

```tsx
  const addClimb = useMutation(api.climbs.add);
  const { startTime, endTime } = getLocalDayRange(selectedDate);
  const climbs = useQuery(api.climbs.getByDate, { startTime, endTime });
```

…add:

```tsx
  const addTraining = useMutation(api.training.add);
  const trainingSessions = useQuery(api.training.getByDate, { startTime, endTime });
```

- [ ] **Step 2: Add the handler**

Below the existing `handleLog` function:

```tsx
  const handleLog = (completed: boolean) => {
    addClimb({
      grade,
      completed,
      holdType,
      climbedAt: normalizeToNoon(selectedDate),
    });
  };
```

…add:

```tsx
  const handleLogTraining = () => {
    addTraining({
      type: "fingerboard",
      trainedAt: normalizeToNoon(selectedDate),
    });
  };
```

- [ ] **Step 3: Update `<ActionButtons>` call**

Change:

```tsx
        <ActionButtons
          onAttempt={() => handleLog(false)}
          onSend={() => handleLog(true)}
        />
```

…to:

```tsx
        <ActionButtons
          onAttempt={() => handleLog(false)}
          onSend={() => handleLog(true)}
          onFingerboard={handleLogTraining}
        />
```

- [ ] **Step 4: Update `<ClimbList>` call to pass training sessions**

(This prepares for Task 6, which extends ClimbList. The prop is added now so the call site is final.)

Change:

```tsx
          <ClimbList climbs={climbs ?? []} />
```

…to:

```tsx
          <ClimbList climbs={climbs ?? []} trainingSessions={trainingSessions ?? []} />
```

- [ ] **Step 5: Type-check**

Run: `pnpm build`

Expected: build still fails — `ClimbList` does not yet accept `trainingSessions`. Task 6 fixes it.

- [ ] **Step 6: Commit**

```bash
git add src/routes/log.tsx
git commit -m "feat(log): wire fingerboard mutation and pass training sessions to ClimbList"
```

---

## Task 6: Extend `ClimbList` to render FB chip after climb chips

**Files:**
- Modify: `src/components/log/climb-list.tsx`

- [ ] **Step 1: Update imports and props**

In `src/components/log/climb-list.tsx`, the current top of the file:

```tsx
import { useRef, useState, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { HandGrabbing, Hand, HandPalm } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { HoldType } from "../../lib/grades";
```

No new imports needed (`Doc`, `Id`, `useMutation`, `api` are already imported).

Replace the existing `ClimbListProps` interface:

```tsx
interface ClimbListProps {
  climbs: Doc<"climbs">[];
}
```

…with:

```tsx
interface ClimbListProps {
  climbs: Doc<"climbs">[];
  trainingSessions: Doc<"trainingSessions">[];
}
```

- [ ] **Step 2: Add the FB chip component**

Below the existing `ClimbChip` function (and before the `ClimbList` export), add:

```tsx
function FingerboardChip({ sessions }: { sessions: Doc<"trainingSessions">[] }) {
  const removeTraining = useMutation(api.training.remove);
  if (sessions.length === 0) return null;

  const handleDelete = () => {
    // `sessions` comes from getByDate ordered desc — index 0 is the most recent
    removeTraining({ id: sessions[0]._id as Id<"trainingSessions"> });
  };

  return (
    <button
      onClick={handleDelete}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full shrink-0 active:brightness-90"
      style={{ backgroundColor: "#4a4a52" }}
    >
      <span className="text-sm font-display text-white font-bold">
        FB ×{sessions.length}
      </span>
    </button>
  );
}
```

- [ ] **Step 3: Update the `ClimbList` export to render the FB chip**

Replace the existing `ClimbList` function. The two key changes: destructure the new prop, render the FB chip after the climb chips in the scroller, and update the empty-state check to consider training too.

Replace:

```tsx
export function ClimbList({ climbs }: ClimbListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hiddenCount, setHiddenCount] = useState(0);

  const calcHidden = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const chips = el.querySelectorAll("[data-chip]");
    let count = 0;
    for (const chip of chips) {
      const rect = chip.getBoundingClientRect();
      const parentRect = el.getBoundingClientRect();
      if (rect.right > parentRect.right + 4) count++;
    }
    setHiddenCount(count);
  }, []);

  useEffect(() => {
    calcHidden();
  }, [climbs, calcHidden]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", calcHidden, { passive: true });
    return () => el.removeEventListener("scroll", calcHidden);
  }, [calcHidden]);

  if (climbs.length === 0) {
    return (
      <p className="text-sm text-muted py-2">
        No climbs yet.
      </p>
    );
  }

  return (
    <div className="relative flex-1 min-w-0">
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {climbs.map((climb) => (
          <span key={climb._id} data-chip>
            <ClimbChip climb={climb} />
          </span>
        ))}
      </div>
      {hiddenCount > 0 && (
        <div className="absolute right-0 top-0 bottom-1 flex items-center pl-4 pointer-events-none" style={{ background: "linear-gradient(to right, transparent, var(--color-neutral-bg) 50%)" }}>
          <span className="text-xs font-display text-muted font-bold">+{hiddenCount}</span>
        </div>
      )}
    </div>
  );
}
```

…with:

```tsx
export function ClimbList({ climbs, trainingSessions }: ClimbListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hiddenCount, setHiddenCount] = useState(0);

  const calcHidden = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const chips = el.querySelectorAll("[data-chip]");
    let count = 0;
    for (const chip of chips) {
      const rect = chip.getBoundingClientRect();
      const parentRect = el.getBoundingClientRect();
      if (rect.right > parentRect.right + 4) count++;
    }
    setHiddenCount(count);
  }, []);

  useEffect(() => {
    calcHidden();
  }, [climbs, trainingSessions, calcHidden]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", calcHidden, { passive: true });
    return () => el.removeEventListener("scroll", calcHidden);
  }, [calcHidden]);

  if (climbs.length === 0 && trainingSessions.length === 0) {
    return (
      <p className="text-sm text-muted py-2">
        No climbs yet.
      </p>
    );
  }

  return (
    <div className="relative flex-1 min-w-0">
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {climbs.map((climb) => (
          <span key={climb._id} data-chip>
            <ClimbChip climb={climb} />
          </span>
        ))}
        {trainingSessions.length > 0 && (
          <span data-chip>
            <FingerboardChip sessions={trainingSessions} />
          </span>
        )}
      </div>
      {hiddenCount > 0 && (
        <div className="absolute right-0 top-0 bottom-1 flex items-center pl-4 pointer-events-none" style={{ background: "linear-gradient(to right, transparent, var(--color-neutral-bg) 50%)" }}>
          <span className="text-xs font-display text-muted font-bold">+{hiddenCount}</span>
        </div>
      )}
    </div>
  );
}
```

Empty-state copy intentionally still says "No climbs yet." rather than "No activity yet." — on most days the user logs climbs, and changing copy to be activity-neutral would feel weaker. If the user logs only fingerboard for a day, the FB chip will show and the empty state won't trigger.

- [ ] **Step 4: Type-check and run dev server**

Run: `pnpm build`

Expected: build succeeds.

Then run: `pnpm dev` and open the app in the browser:
1. Navigate to `/log`.
2. Tap the new FB button. The graphite "FB ×1" chip should appear in the chip row.
3. Tap FB again. Chip updates to "FB ×2".
4. Tap the FB chip. Count drops to 1, then disappears at 0.
5. Use the date arrows to navigate to a past date. Tap FB. Chip appears for that date. Navigate forward; chip disappears (date-scoped).
6. Log a climb + fingerboard on the same day. Both chips render in the same scrollable row.

Stop the dev server after verifying.

- [ ] **Step 5: Commit**

```bash
git add src/components/log/climb-list.tsx
git commit -m "feat(log): render fingerboard chip alongside climb chips"
```

---

## Task 7: Render fingerboard treatments on `YearCalendar`

**Files:**
- Modify: `src/components/analytics/year-calendar.tsx`

- [ ] **Step 1: Extend props and build the training lookup map**

In `src/components/analytics/year-calendar.tsx`, the current props type:

```tsx
export function YearCalendar({ data, goalDate }: { data: HeatmapEntry[]; goalDate?: string | null }) {
```

…replace with:

```tsx
interface TrainingEntry {
  date: string;  // "YYYY-MM-DD"
  count: number;
}

export function YearCalendar({
  data,
  trainingData = [],
  goalDate,
}: {
  data: HeatmapEntry[];
  trainingData?: TrainingEntry[];
  goalDate?: string | null;
}) {
```

After the existing `dayMap` build (the `for (const entry of data)` loop), add a parallel map for training. Find this block:

```tsx
  // Build lookup map for selected year
  const dayMap = new Map<string, number>();
  for (const entry of data) {
    if (entry.date.startsWith(String(selectedYear))) {
      dayMap.set(entry.date, entry.count);
    }
  }
```

…and add immediately below it:

```tsx
  const trainingMap = new Map<string, number>();
  for (const entry of trainingData) {
    if (entry.date.startsWith(String(selectedYear))) {
      trainingMap.set(entry.date, entry.count);
    }
  }
```

- [ ] **Step 2: Update the day-cell rendering**

The lightTextGrades set already exists in `src/components/analytics/activity-heatmap.tsx`; we need an equivalent here. Inside the `YearCalendar` function, near the top (right after `const navigate = useNavigate();`), add:

```tsx
  const lightTextGrades = new Set(["V4", "V5", "V6", "V7", "V8", "V10"]);
```

Then locate the inner per-day rendering block — the one starting at:

```tsx
                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
                  const day = dayIdx + 1;
                  const dateStr = `${selectedYear}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const count = dayMap.get(dateStr);
                  const isFuture = dateStr > todayStr;
                  const isGoalDate = goalDate === dateStr;
                  const isCompDate = compDates.has(dateStr);
                  const isToday = dateStr === todayStr;
```

Right after `const isToday = dateStr === todayStr;` add:

```tsx
                  const trainingCount = trainingMap.get(dateStr);
                  const hasTraining = trainingCount !== undefined && trainingCount > 0;
                  const hasClimb = count !== undefined && count > 0;
```

The existing `isRest` line:

```tsx
                  const isRest = !isFuture && count === undefined && dateStr >= earliestDate && dateStr <= todayStr;
```

…replace with:

```tsx
                  const isRest = !isFuture && !hasClimb && !hasTraining && dateStr >= earliestDate && dateStr <= todayStr;
```

The existing background-decision block:

```tsx
                  if (isFuture) {
                    bg = "rgba(128,128,128,0.08)";
                  } else if (count !== undefined && count > 0) {
                    const grade = GRADES[count - 1];
                    if (grade) {
                      bg = colorMap[grade];
                      if (!isToday) {
                        border = "1px solid rgba(128,128,128,0.15)";
                      }
                    }
                  }
```

…replace with:

```tsx
                  let backgroundImageFromTraining: string | undefined;

                  if (isFuture) {
                    bg = "rgba(128,128,128,0.08)";
                  } else if (hasClimb) {
                    const grade = GRADES[count - 1];
                    if (grade) {
                      bg = colorMap[grade];
                      if (!isToday) {
                        border = "1px solid rgba(128,128,128,0.15)";
                      }
                    }
                  } else if (hasTraining) {
                    bg = "rgba(74,74,82,0.12)";
                    backgroundImageFromTraining = "radial-gradient(#4a4a52 1px, transparent 1.4px)";
                    if (!isToday) {
                      border = "1px solid rgba(74,74,82,0.25)";
                    }
                  }
```

The existing `backgroundImage` declaration for the goal-date pattern:

```tsx
                  // Checkered flag pattern for goal date
                  let backgroundImage: string | undefined;
                  if (isGoalDate) {
                    backgroundImage = `
                      repeating-conic-gradient(
                        var(--color-border) 0% 25%,
                        var(--color-neutral-bg) 0% 50%
                      )`;
                    bg = "transparent";
                    border = "none";
                    boxShadow = "inset 0 0 0 1px rgba(202, 164, 43, 0.9)";
                  }
```

…replace with:

```tsx
                  // Checkered flag pattern for goal date
                  let backgroundImage: string | undefined = backgroundImageFromTraining;
                  if (isGoalDate) {
                    backgroundImage = `
                      repeating-conic-gradient(
                        var(--color-border) 0% 25%,
                        var(--color-neutral-bg) 0% 50%
                      )`;
                    bg = "transparent";
                    border = "none";
                    boxShadow = "inset 0 0 0 1px rgba(202, 164, 43, 0.9)";
                  }
```

Now find the existing inline style on the cell `<div>`:

```tsx
                      style={{
                        backgroundColor: bg,
                        backgroundImage,
                        backgroundSize: isGoalDate ? "4px 4px" : undefined,
                        border,
                        boxShadow,
                        boxSizing: "border-box",
                      }}
```

…replace with:

```tsx
                      style={{
                        backgroundColor: bg,
                        backgroundImage,
                        backgroundSize: isGoalDate ? "4px 4px" : (backgroundImageFromTraining && !isGoalDate ? "5px 5px" : undefined),
                        border,
                        boxShadow,
                        boxSizing: "border-box",
                      }}
```

- [ ] **Step 3: Render the session count overlay**

The existing rendered children inside the cell:

```tsx
                      {isCompDate && !isGoalDate && <Trophy size={6} weight="fill" className="opacity-60" style={{ color: "rgba(202, 164, 43, 1)" }} />}
                      {isRest && !isCompDate && <Moon size={6} weight="fill" className="opacity-20" />}
```

…replace with:

```tsx
                      {isCompDate && !isGoalDate && <Trophy size={6} weight="fill" className="opacity-60" style={{ color: "rgba(202, 164, 43, 1)" }} />}
                      {isRest && !isCompDate && <Moon size={6} weight="fill" className="opacity-20" />}
                      {hasTraining && !isGoalDate && (
                        <span
                          className="absolute font-display font-bold leading-none select-none"
                          style={{
                            top: 1,
                            right: 2,
                            fontSize: 6,
                            color: hasClimb
                              ? (lightTextGrades.has(GRADES[count - 1]) ? "white" : "var(--color-border)")
                              : "#4a4a52",
                          }}
                        >
                          {trainingCount}
                        </span>
                      )}
```

For the absolute-positioned span to render correctly, the cell `<div>` must be a positioning context. Find the cell's className:

```tsx
                      className={`aspect-square rounded-[2px] flex items-center justify-center${!isFuture ? " cursor-pointer hover:ring-1 hover:ring-border/50" : ""}`}
```

…and add `relative`:

```tsx
                      className={`relative aspect-square rounded-[2px] flex items-center justify-center${!isFuture ? " cursor-pointer hover:ring-1 hover:ring-border/50" : ""}`}
```

The `count - 1` access inside the color expression is safe because it's only evaluated when `hasClimb` is true (which requires `count > 0`).

- [ ] **Step 4: Type-check**

Run: `pnpm build`

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/analytics/year-calendar.tsx
git commit -m "feat(journey): render fingerboard sessions on YearCalendar"
```

---

## Task 8: Pass training data from `/journey` route

**Files:**
- Modify: `src/routes/journey.tsx`

- [ ] **Step 1: Add the training query and forward it**

In `src/routes/journey.tsx`, after the existing heatmap/timeline queries (around line 16-17):

```tsx
  const heatmap = useQuery(api.analytics.heatmapData);
  const timeline = useQuery(api.analytics.timelineMilestones, { goalGrade: GOAL_GRADE });
```

…add:

```tsx
  const trainingData = useQuery(api.analytics.trainingByDate);
```

Then change the `<YearCalendar>` invocation:

```tsx
      {heatmap && <YearCalendar data={heatmap} goalDate={goalDateStr} />}
```

…to:

```tsx
      {heatmap && <YearCalendar data={heatmap} trainingData={trainingData ?? []} goalDate={goalDateStr} />}
```

- [ ] **Step 2: Type-check and run dev server**

Run: `pnpm build`

Expected: build succeeds.

Then run: `pnpm dev` and verify end-to-end:

1. On `/log`, tap FB twice for today. The "FB ×2" chip should appear.
2. Navigate to `/journey`. Today's cell should have the graphite dot-pattern background and a small "2" in the top-right corner.
3. On `/log`, log a climb (e.g. V4 Send) on the same day. Navigate to `/journey`. The cell now shows the V4 color fill with a small "2" overlay in the top-right (white if V4's text is light, dark otherwise — verify visually that it reads).
4. Use the date nav on `/log` to go to a past day with no climbs. Tap FB. Navigate to `/journey`; the past day shows the dot pattern, and is **not** styled as a rest-day moon.
5. Confirm the Activity Heatmap (week stripe — separate component, present elsewhere on the analytics route) is unchanged.
6. Confirm goal date and competition date styling still take precedence over fingerboard styling (no fingerboard count should appear on a goal date — that's gated by `!isGoalDate`).

Stop the dev server after verifying.

- [ ] **Step 3: Commit**

```bash
git add src/routes/journey.tsx
git commit -m "feat(journey): pass training data into YearCalendar"
```

---

## Final verification checklist

After all tasks are complete, run through this manually:

- [ ] `pnpm build` succeeds with no errors.
- [ ] `pnpm lint` succeeds (or only flags pre-existing issues).
- [ ] FB button appears as third action on `/log` and visually balances with Attempt/Send.
- [ ] Tapping FB adds a session for the selected date; multiple taps stack the count.
- [ ] Tapping the FB chip removes one session.
- [ ] FB chip lives in the chip row, after climb chips, doesn't displace climb order.
- [ ] FB-only days on the Year Calendar show dot pattern + corner count, no moon icon.
- [ ] Combo days (climb + FB) show grade fill + corner count in contrast color.
- [ ] Goal-date and competition-date cells suppress FB overlay (existing styling wins).
- [ ] Activity Heatmap on the analytics route is visually unchanged.
- [ ] The grade pyramid, observations, and hold-type analytics are unchanged.

---

## Scope reminder (do not implement)

- Weights button (future training type) — schema already supports it via the `type` union.
- Including fingerboard in the grade pyramid, observations, or any climb-grade analytics.
- Streaks or weekly targets for fingerboard.
- Notes per fingerboard session.
- Fingerboard on the Activity Heatmap.
