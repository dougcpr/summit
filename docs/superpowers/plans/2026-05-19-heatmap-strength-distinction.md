# Heatmap Strength Distinction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the heatmap, render strength days with a yellow half-triangle and Barbell icon (distinct from fingerboard's indigo+Moon), and collapse all climb days to a solid grade block (rolling back the climb+training diagonal split).

**Architecture:** Extend `trainingByDate` to return per-date `hasFingerboard` / `hasStrength` booleans. The two heatmap components (`year-calendar.tsx`, `recent-months.tsx`) consume those flags to pick fill color (indigo for any FB, yellow for strength-only), pick icon (Barbell when strength is present, Moon otherwise), and unconditionally render climb days as a solid grade block.

**Tech Stack:** Convex (backend), React 19, TypeScript, TanStack Router, Tailwind v4, Phosphor Icons.

**Verification convention:** No automated test suite. Each task that changes code ends with `pnpm build` + commit. The final task deploys Convex with `npx convex dev --once` and runs a manual browser checklist.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `convex/analytics.ts` | Modify | Extend `trainingByDate` to return `{date, count, hasFingerboard, hasStrength}` |
| `src/components/analytics/year-calendar.tsx` | Modify | Widen `TrainingEntry`, switch `trainingMap` to carry flags, simplify climb branch, branch training color on fingerboard/strength, swap Moon→Barbell on strength days, add `STRENGTH_FILL` + `Barbell` import, remove dead `dotPattern` |
| `src/components/analytics/recent-months.tsx` | Modify | Same set of changes, parallel structure |
| `convex/_generated/api.d.ts` | Auto-regen | Updates when `npx convex dev --once` runs |

---

## Task 1: Extend `trainingByDate` to include type flags

**Files:**
- Modify: `convex/analytics.ts:127-145`

- [ ] **Step 1: Replace the `trainingByDate` query**

In `/Users/dougcooper/Documents/Code/summit/convex/analytics.ts`, find the existing `trainingByDate` export (currently lines 127-145):

```ts
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

Replace it with:

```ts
export const trainingByDate = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const sessions = await ctx.db
      .query("trainingSessions")
      .withIndex("by_user_date", (q: any) => q.eq("userId", userId))
      .collect();

    const byDate: Record<string, { count: number; hasFingerboard: boolean; hasStrength: boolean }> = {};
    for (const s of sessions) {
      const d = new Date(s.trainedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const entry = byDate[key] ?? { count: 0, hasFingerboard: false, hasStrength: false };
      entry.count++;
      if (s.type === "fingerboard") entry.hasFingerboard = true;
      if (s.type === "strength") entry.hasStrength = true;
      byDate[key] = entry;
    }

    return Object.entries(byDate).map(([date, info]) => ({
      date,
      count: info.count,
      hasFingerboard: info.hasFingerboard,
      hasStrength: info.hasStrength,
    }));
  },
});
```

The aggregation now tracks `hasFingerboard` / `hasStrength` per date alongside the running `count`. The return shape is widened with two booleans.

- [ ] **Step 2: Type-check**

Run: `cd /Users/dougcooper/Documents/Code/summit && pnpm build`

Expected: build succeeds. (The frontend consumers in `year-calendar.tsx` and `recent-months.tsx` declare a narrower local `TrainingEntry` type that ignores the new fields — they continue to compile because TypeScript allows excess properties on the server response. Those types are widened in Tasks 2 and 3.)

- [ ] **Step 3: Commit**

```bash
git add convex/analytics.ts
git commit -m "$(cat <<'EOF'
feat(analytics): include hasFingerboard/hasStrength flags in trainingByDate

The heatmap renderers need to distinguish training composition per day
so strength gets a yellow tile + barbell icon and fingerboard stays
indigo + moon. The flags are derived from existing session rows; no
schema change.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Update `YearCalendar` rendering

**Files:**
- Modify: `src/components/analytics/year-calendar.tsx`

- [ ] **Step 1: Add the `Barbell` import**

In `/Users/dougcooper/Documents/Code/summit/src/components/analytics/year-calendar.tsx` line 3, add `Barbell` to the Phosphor import:

Before:
```tsx
import { CaretLeft, CaretRight, Moon, Trophy } from "@phosphor-icons/react";
```

After:
```tsx
import { CaretLeft, CaretRight, Moon, Trophy, Barbell } from "@phosphor-icons/react";
```

- [ ] **Step 2: Add the `STRENGTH_FILL` constant**

Immediately after the `TRAINING_FILL` constant (currently line 8), add:

```tsx
const STRENGTH_FILL = "rgba(245,158,11,0.5)";
```

The block should read:

```tsx
const EMPTY_COLOR = "var(--color-neutral-bg)";
const TRAINING_FILL = "rgba(107,92,196,0.45)";
const STRENGTH_FILL = "rgba(245,158,11,0.5)";
```

- [ ] **Step 3: Widen the `TrainingEntry` interface**

Replace the existing `TrainingEntry` interface (currently lines 25-28):

```tsx
interface TrainingEntry {
  date: string;  // "YYYY-MM-DD"
  count: number;
}
```

With:

```tsx
interface TrainingEntry {
  date: string;  // "YYYY-MM-DD"
  count: number;
  hasFingerboard: boolean;
  hasStrength: boolean;
}
```

- [ ] **Step 4: Replace the `trainingMap` build to carry flags**

Find the `trainingMap` block (currently lines 59-64):

```tsx
  const trainingMap = new Map<string, number>();
  for (const entry of trainingData) {
    if (entry.date.startsWith(String(selectedYear))) {
      trainingMap.set(entry.date, entry.count);
    }
  }
```

Replace with:

```tsx
  const trainingMap = new Map<string, { hasFingerboard: boolean; hasStrength: boolean }>();
  for (const entry of trainingData) {
    if (entry.date.startsWith(String(selectedYear))) {
      trainingMap.set(entry.date, {
        hasFingerboard: entry.hasFingerboard,
        hasStrength: entry.hasStrength,
      });
    }
  }
```

- [ ] **Step 5: Replace the per-cell `trainingCount`/`hasTraining` lookup**

Find the cell-level training lookup (currently lines 133-134):

```tsx
                  const trainingCount = trainingMap.get(dateStr);
                  const hasTraining = trainingCount !== undefined && trainingCount > 0;
```

Replace with:

```tsx
                  const trainingInfo = trainingMap.get(dateStr);
                  const hasTraining = trainingInfo !== undefined;
                  const hasFingerboard = trainingInfo?.hasFingerboard ?? false;
                  const hasStrength = trainingInfo?.hasStrength ?? false;
```

- [ ] **Step 6: Simplify the climb branch (remove the diagonal split)**

Find the climb branch (currently lines 152-164):

```tsx
                  } else if (hasClimb) {
                    const grade = GRADES[count - 1];
                    if (grade) {
                      if (hasTraining) {
                        splitGradient = `linear-gradient(135deg, ${colorMap[grade]} 0 50%, ${TRAINING_FILL} 50% 100%)`;
                        bg = "transparent";
                      } else {
                        bg = colorMap[grade];
                      }
                      if (!isToday) {
                        border = "1px solid rgba(128,128,128,0.15)";
                      }
                    }
                  } else if (hasTraining) {
                    splitGradient = `linear-gradient(135deg, ${EMPTY_COLOR} 0 50%, ${TRAINING_FILL} 50% 100%)`;
                    bg = "transparent";
                    if (!isToday) {
                      border = "1px solid rgba(107,92,196,0.4)";
                    }
                  }
```

Replace with:

```tsx
                  } else if (hasClimb) {
                    const grade = GRADES[count - 1];
                    if (grade) {
                      bg = colorMap[grade];
                      if (!isToday) {
                        border = "1px solid rgba(128,128,128,0.15)";
                      }
                    }
                  } else if (hasTraining) {
                    const fill = hasFingerboard ? TRAINING_FILL : STRENGTH_FILL;
                    const borderColor = hasFingerboard ? "rgba(107,92,196,0.4)" : "rgba(245,158,11,0.5)";
                    splitGradient = `linear-gradient(135deg, ${EMPTY_COLOR} 0 50%, ${fill} 50% 100%)`;
                    bg = "transparent";
                    if (!isToday) {
                      border = `1px solid ${borderColor}`;
                    }
                  }
```

Key changes:
- The climb branch always sets `bg = colorMap[grade]`. The nested `if (hasTraining)` split is gone.
- The training-only branch picks fill+border based on `hasFingerboard` (indigo if FB present, yellow otherwise).

- [ ] **Step 7: Remove the dead `dotPattern` variable and simplify `backgroundImage`**

Find the `dotPattern` declaration and the `backgroundImage` computation (currently lines 147-148, 173-174):

```tsx
                  let dotPattern: string | undefined;
                  let splitGradient: string | undefined;
```

Remove the `dotPattern` line (it's never assigned now), leaving:

```tsx
                  let splitGradient: string | undefined;
```

Then find:

```tsx
                  let backgroundImage: string | undefined = splitGradient ?? dotPattern;
                  let backgroundSize: string | undefined = dotPattern && !splitGradient ? "5px 5px" : undefined;
```

Replace with:

```tsx
                  let backgroundImage: string | undefined = splitGradient;
                  let backgroundSize: string | undefined;
```

- [ ] **Step 8: Swap Moon for Barbell when strength is present**

Find the existing fb-only Moon (currently lines 217-219):

```tsx
                      {hasTraining && !hasClimb && !isCompDate && !isFuture && (
                        <Moon size={5} weight="fill" className="absolute opacity-30" style={{ top: 0, left: 0 }} />
                      )}
```

Replace with:

```tsx
                      {hasTraining && !hasClimb && !isCompDate && !isFuture && (
                        hasStrength ? (
                          <Barbell size={5} weight="fill" className="absolute opacity-40" style={{ top: 0, left: 0 }} />
                        ) : (
                          <Moon size={5} weight="fill" className="absolute opacity-30" style={{ top: 0, left: 0 }} />
                        )
                      )}
```

Barbell uses `opacity-40` (vs Moon's `opacity-30`) because at 5px the barbell silhouette is thinner and needs more contrast to read against the yellow tile.

- [ ] **Step 9: Type-check**

Run: `cd /Users/dougcooper/Documents/Code/summit && pnpm build`

Expected: build succeeds. The new `hasFingerboard` / `hasStrength` props on `TrainingEntry` are satisfied by the widened `trainingByDate` return shape from Task 1.

- [ ] **Step 10: Commit**

```bash
git add src/components/analytics/year-calendar.tsx
git commit -m "$(cat <<'EOF'
feat(analytics): distinguish strength days on year calendar

Strength days now render a yellow half-triangle with a barbell icon;
fingerboard days stay indigo + moon. Climb days collapse to a solid
grade block, rolling back the climb+fingerboard diagonal split — climb
is the headline activity and training stays out of its way.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Update `RecentMonths` rendering

**Files:**
- Modify: `src/components/analytics/recent-months.tsx`

- [ ] **Step 1: Update the Phosphor import**

In `/Users/dougcooper/Documents/Code/summit/src/components/analytics/recent-months.tsx` line 2:

Before:
```tsx
import { Moon } from "@phosphor-icons/react";
```

After:
```tsx
import { Moon, Barbell } from "@phosphor-icons/react";
```

- [ ] **Step 2: Add the `STRENGTH_FILL` constant**

Immediately after the `TRAINING_FILL` constant (currently line 6):

```tsx
const EMPTY_COLOR = "var(--color-neutral-bg)";
const TRAINING_FILL = "rgba(107,92,196,0.45)";
const STRENGTH_FILL = "rgba(245,158,11,0.5)";
```

- [ ] **Step 3: Widen the `TrainingEntry` interface**

Replace the existing `TrainingEntry` interface (currently lines 15-18):

```tsx
interface TrainingEntry {
  date: string;
  count: number;
}
```

With:

```tsx
interface TrainingEntry {
  date: string;
  count: number;
  hasFingerboard: boolean;
  hasStrength: boolean;
}
```

- [ ] **Step 4: Replace the `trainingMap` build**

Find (currently lines 50-53):

```tsx
  const trainingMap = new Map<string, number>();
  for (const entry of trainingData) {
    trainingMap.set(entry.date, entry.count);
  }
```

Replace with:

```tsx
  const trainingMap = new Map<string, { hasFingerboard: boolean; hasStrength: boolean }>();
  for (const entry of trainingData) {
    trainingMap.set(entry.date, {
      hasFingerboard: entry.hasFingerboard,
      hasStrength: entry.hasStrength,
    });
  }
```

- [ ] **Step 5: Replace the per-cell `hasTraining` lookup**

Find (currently line 92):

```tsx
                const hasTraining = (trainingMap.get(dateStr) ?? 0) > 0;
```

Replace with:

```tsx
                const trainingInfo = trainingMap.get(dateStr);
                const hasTraining = trainingInfo !== undefined;
                const hasFingerboard = trainingInfo?.hasFingerboard ?? false;
                const hasStrength = trainingInfo?.hasStrength ?? false;
```

- [ ] **Step 6: Simplify the climb branch and branch training color**

Find (currently lines 109-128):

```tsx
                } else if (hasClimb) {
                  const grade = GRADES[count - 1];
                  if (grade) {
                    if (hasTraining) {
                      backgroundImage = `linear-gradient(135deg, ${colorMap[grade]} 0 50%, ${TRAINING_FILL} 50% 100%)`;
                      bg = "transparent";
                    } else {
                      bg = colorMap[grade];
                    }
                    if (!isToday) {
                      border = "1px solid rgba(128,128,128,0.15)";
                    }
                  }
                } else if (hasTraining) {
                  backgroundImage = `linear-gradient(135deg, ${EMPTY_COLOR} 0 50%, ${TRAINING_FILL} 50% 100%)`;
                  bg = "transparent";
                  if (!isToday) {
                    border = "1px solid rgba(107,92,196,0.4)";
                  }
                }
```

Replace with:

```tsx
                } else if (hasClimb) {
                  const grade = GRADES[count - 1];
                  if (grade) {
                    bg = colorMap[grade];
                    if (!isToday) {
                      border = "1px solid rgba(128,128,128,0.15)";
                    }
                  }
                } else if (hasTraining) {
                  const fill = hasFingerboard ? TRAINING_FILL : STRENGTH_FILL;
                  const borderColor = hasFingerboard ? "rgba(107,92,196,0.4)" : "rgba(245,158,11,0.5)";
                  backgroundImage = `linear-gradient(135deg, ${EMPTY_COLOR} 0 50%, ${fill} 50% 100%)`;
                  bg = "transparent";
                  if (!isToday) {
                    border = `1px solid ${borderColor}`;
                  }
                }
```

Same shape as Year-Calendar's logic — climb is unconditionally solid, training picks color based on fingerboard presence.

- [ ] **Step 7: Swap Moon for Barbell when strength is present**

Find (currently lines 144-146):

```tsx
                    {hasTraining && !hasClimb && !isFuture && (
                      <Moon size={6} weight="fill" className="absolute opacity-30" style={{ top: 1, left: 1 }} />
                    )}
```

Replace with:

```tsx
                    {hasTraining && !hasClimb && !isFuture && (
                      hasStrength ? (
                        <Barbell size={6} weight="fill" className="absolute opacity-40" style={{ top: 1, left: 1 }} />
                      ) : (
                        <Moon size={6} weight="fill" className="absolute opacity-30" style={{ top: 1, left: 1 }} />
                      )
                    )}
```

- [ ] **Step 8: Type-check**

Run: `cd /Users/dougcooper/Documents/Code/summit && pnpm build`

Expected: build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/components/analytics/recent-months.tsx
git commit -m "$(cat <<'EOF'
feat(analytics): distinguish strength days on recent-months heatmap

Mirror the year-calendar change: yellow half-triangle + barbell icon
for strength, indigo + moon for fingerboard, solid grade block for
all climb days.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Deploy to Convex and verify in browser

**Files:**
- Auto-regen: `convex/_generated/api.d.ts` (if Convex codegen produces changes)

- [ ] **Step 1: Deploy the Convex function changes**

Run: `cd /Users/dougcooper/Documents/Code/summit && npx convex dev --once`

Expected: "Convex functions ready!" within ~10 seconds. The deployed `trainingByDate` now returns the wider shape.

- [ ] **Step 2: Manual browser verification**

Run: `cd /Users/dougcooper/Documents/Code/summit && pnpm dev`

In a browser, open `/analytics` and `/journey`. Verify each state:

1. **Rest day (no climb, no training):** empty cell with a Moon icon centered. No half-triangle.
2. **Fingerboard-only day:** half-triangle with indigo bottom-right fill, Moon icon in the top-left of the empty triangle.
3. **Strength-only day:** half-triangle with **yellow** bottom-right fill, **Barbell** icon in the top-left. Use the Log page to tap the Barbell button on a no-FB day if you don't already have one.
4. **Fingerboard + strength day:** half-triangle with **indigo** bottom-right fill (FB wins on color), **Barbell** icon in the top-left (strength wins on icon).
5. **Climb-only day:** solid grade-color block. No half-triangle, no icon.
6. **Climb + fingerboard day:** **solid grade-color block** (regression check — previously this showed a diagonal split, now it should not).
7. **Climb + strength day:** solid grade-color block (no yellow visible).
8. **Competition date (gold cell with trophy):** unchanged.
9. **Goal date (checkered):** unchanged.

If any state renders wrong, stop and report which state and which file.

- [ ] **Step 3: Commit regenerated types if any**

Run: `git status`

If `convex/_generated/api.d.ts` shows as modified:

```bash
git add convex/_generated/api.d.ts
git commit -m "$(cat <<'EOF'
chore(convex): regenerate api.d.ts after trainingByDate widening

Codegen refresh after deploying the new return shape.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If no changes, skip this step.

---

## Self-Review

**Spec coverage:**

| Spec section | Implemented in |
|---|---|
| Backend `hasFingerboard` / `hasStrength` flags | Task 1 |
| `STRENGTH_FILL` constant | Tasks 2, 3 |
| Widened `TrainingEntry` types | Tasks 2 (step 3), 3 (step 3) |
| `trainingMap` carries flags | Tasks 2 (step 4), 3 (step 4) |
| Climb supersedes training (solid grade block) | Tasks 2 (step 6), 3 (step 6) |
| Training color: indigo if FB, yellow if strength-only | Tasks 2 (step 6), 3 (step 6) |
| Icon: Barbell if strength, Moon otherwise | Tasks 2 (step 8), 3 (step 7) |
| Convex deploy step | Task 4 (step 1) |
| Manual browser verification | Task 4 (step 2) |

**Placeholder scan:** No TBDs. Every step shows the exact code change.

**Type consistency:**
- `TrainingEntry.hasFingerboard` / `.hasStrength` are introduced in Task 1's return shape and consumed by the same property names in Tasks 2 and 3.
- `STRENGTH_FILL` literal is identical in both files (`"rgba(245,158,11,0.5)"`).
- The strength border color `"rgba(245,158,11,0.5)"` matches the fill rgba exactly so they read as one color family.
- `Barbell` import is added once per file (Tasks 2 step 1, 3 step 1) and used once per file.
