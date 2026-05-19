# Strength Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one-tap strength-training logging on the Log page — a fourth Barbell-icon action button, a Barbell chip in the chip list, and inclusion in existing training-day heatmap rendering.

**Architecture:** Widen the existing `trainingSessions.type` union from `"fingerboard"` to `"fingerboard" | "strength"`. No new tables, no new Convex files, no analytics changes — `trainingByDate` already aggregates by date regardless of type. UI changes touch only `ActionButtons`, `ClimbList`, and the `/log` route.

**Tech Stack:** Convex (backend + reactive queries), React 19, TypeScript, TanStack Router, Tailwind v4, Phosphor Icons.

**Verification convention:** This project has no automated test suite (no `test` script in `package.json` — only `lint` and `build`). Each task that changes code ends with manual verification: type-checks via `pnpm build` for the relevant files. The final task includes a manual browser check on `pnpm dev`. Commit after each task.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `convex/schema.ts` | Modify | Widen `trainingSessions.type` union to include `"strength"` |
| `convex/training.ts` | Modify | Widen `add` mutation validator to accept `"strength"` |
| `src/components/log/action-buttons.tsx` | Modify | Add fourth `onStrength` Barbell button |
| `src/routes/log.tsx` | Modify | Add `handleLogStrength` and wire it through to `ActionButtons` |
| `src/components/log/climb-list.tsx` | Modify | Partition training sessions by type; render a `StrengthChip` |

---

## Task 1: Widen schema type union

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Edit the union**

In `convex/schema.ts`, find the `trainingSessions` table definition. Change the `type` field from a single-literal union to a two-literal union:

Before:
```ts
  trainingSessions: defineTable({
    userId: v.string(),
    type: v.union(v.literal("fingerboard")),
    trainedAt: v.number(),
  }).index("by_user_date", ["userId", "trainedAt"]),
```

After:
```ts
  trainingSessions: defineTable({
    userId: v.string(),
    type: v.union(v.literal("fingerboard"), v.literal("strength")),
    trainedAt: v.number(),
  }).index("by_user_date", ["userId", "trainedAt"]),
```

This is a non-breaking widening — existing rows are all `"fingerboard"`, which remains valid under the wider union.

- [ ] **Step 2: Type-check**

Run: `pnpm build`

Expected: build succeeds. (Convex generated types regenerate when `convex dev` is running; without it the build still passes because no caller passes `"strength"` yet.)

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(training): widen trainingSessions.type to include strength"
```

---

## Task 2: Widen the `add` mutation validator

**Files:**
- Modify: `convex/training.ts`

- [ ] **Step 1: Edit the validator**

In `convex/training.ts`, find the `add` mutation. Change its `type` arg validator the same way:

Before:
```ts
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
```

After:
```ts
export const add = mutation({
  args: {
    type: v.union(v.literal("fingerboard"), v.literal("strength")),
    trainedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    return await ctx.db.insert("trainingSessions", { ...args, userId });
  },
});
```

`getByDate` and `remove` are type-agnostic and need no edits.

- [ ] **Step 2: Type-check**

Run: `pnpm build`

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add convex/training.ts
git commit -m "feat(training): accept strength type in add mutation"
```

---

## Task 3: Add the Barbell action button

**Files:**
- Modify: `src/components/log/action-buttons.tsx`

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `src/components/log/action-buttons.tsx` with:

```tsx
import { Plus, Check, Barbell } from "@phosphor-icons/react";

interface ActionButtonsProps {
  onAttempt: () => void;
  onSend: () => void;
  onFingerboard: () => void;
  onStrength: () => void;
  disabled?: boolean;
}

export function ActionButtons({ onAttempt, onSend, onFingerboard, onStrength, disabled }: ActionButtonsProps) {
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
      <button
        onClick={onStrength}
        disabled={disabled}
        className="flex-1 flex items-center justify-center py-4 text-white rounded-lg active:brightness-90 disabled:opacity-30 disabled:active:brightness-100"
        style={{ backgroundColor: "#4a4a52" }}
      >
        <Barbell size={32} weight="bold" />
      </button>
    </div>
  );
}
```

Key changes versus the previous version:
- Added `Barbell` to the Phosphor import.
- Added `onStrength: () => void` to `ActionButtonsProps`.
- Destructured `onStrength` in the function signature.
- Added a fourth `<button>` after FB, with the same `#4a4a52` background and a `Barbell` icon.

- [ ] **Step 2: Type-check**

Run: `pnpm build`

Expected: `pnpm build` will FAIL because `src/routes/log.tsx` does not yet pass `onStrength` to `ActionButtons`. This is expected — Task 4 supplies the prop. Confirm the failure is exactly that missing-prop type error and not something else.

- [ ] **Step 3: Do not commit yet**

Hold this change; it is committed together with Task 4 since the two changes form one working unit (button + handler).

---

## Task 4: Wire `handleLogStrength` into `LogPage`

**Files:**
- Modify: `src/routes/log.tsx`

- [ ] **Step 1: Add the handler**

In `src/routes/log.tsx`, just below the existing `handleLogTraining` function (around line 63-68), add:

```tsx
  const handleLogStrength = () => {
    addTraining({
      type: "strength",
      trainedAt: normalizeToNoon(selectedDate),
    });
  };
```

- [ ] **Step 2: Pass it to `ActionButtons`**

Find the `<ActionButtons />` JSX (around line 95-99) and add the `onStrength` prop:

Before:
```tsx
        <ActionButtons
          onAttempt={() => handleLog(false)}
          onSend={() => handleLog(true)}
          onFingerboard={handleLogTraining}
        />
```

After:
```tsx
        <ActionButtons
          onAttempt={() => handleLog(false)}
          onSend={() => handleLog(true)}
          onFingerboard={handleLogTraining}
          onStrength={handleLogStrength}
        />
```

- [ ] **Step 3: Type-check**

Run: `pnpm build`

Expected: build succeeds. Both Task 3 and Task 4 changes are now consistent.

- [ ] **Step 4: Commit both files together**

```bash
git add src/components/log/action-buttons.tsx src/routes/log.tsx
git commit -m "feat(log): add strength action button"
```

---

## Task 5: Render a Strength chip in `ClimbList`

**Files:**
- Modify: `src/components/log/climb-list.tsx`

- [ ] **Step 1: Add the `Barbell` import**

In `src/components/log/climb-list.tsx`, find the existing Phosphor import (line 3) and add `Barbell`:

Before:
```tsx
import { HandGrabbing, Hand, HandPalm } from "@phosphor-icons/react";
```

After:
```tsx
import { HandGrabbing, Hand, HandPalm, Barbell } from "@phosphor-icons/react";
```

- [ ] **Step 2: Add the `StrengthChip` component**

Immediately after the `FingerboardChip` function (currently lines 43-62), add this new chip component:

```tsx
function StrengthChip({ sessions }: { sessions: Doc<"trainingSessions">[] }) {
  const removeTraining = useMutation(api.training.remove);
  if (sessions.length === 0) return null;

  const handleDelete = () => {
    removeTraining({ id: sessions[0]._id as Id<"trainingSessions"> });
  };

  return (
    <button
      onClick={handleDelete}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full shrink-0 active:brightness-90"
      style={{ backgroundColor: "#4a4a52" }}
    >
      <Barbell size={14} weight="bold" className="text-white" />
      <span className="text-sm font-display text-white font-bold">
        ×{sessions.length}
      </span>
    </button>
  );
}
```

This mirrors `FingerboardChip` exactly except: no "FB" label, a Barbell icon instead.

- [ ] **Step 3: Partition sessions by type in `ClimbList`**

Find the start of the `ClimbList` function body (currently line 64-65). Just after the `const { climbs, trainingSessions } = ...` destructure isn't there — the params are destructured in the function signature. Instead, immediately inside the `ClimbList` function body (after `const scrollRef = ...` and the `useState`/`useCallback` block, but before the early-return check), partition the sessions.

The cleanest place is right at the top of the function body, immediately after the function signature:

Before:
```tsx
export function ClimbList({ climbs, trainingSessions }: ClimbListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
```

After:
```tsx
export function ClimbList({ climbs, trainingSessions }: ClimbListProps) {
  const fingerboardSessions = trainingSessions.filter((s) => s.type === "fingerboard");
  const strengthSessions = trainingSessions.filter((s) => s.type === "strength");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
```

- [ ] **Step 4: Update the empty-state check**

The existing empty-state guard checks `trainingSessions.length === 0`. It is still correct because both filters are subsets of `trainingSessions` — if `trainingSessions.length === 0` then both filtered arrays are empty too. No change needed.

- [ ] **Step 5: Update the FB chip prop and add the Strength chip in the render output**

Find the existing `FingerboardChip` rendering (currently around lines 112-116) and update both the prop and what follows it:

Before:
```tsx
        {trainingSessions.length > 0 && (
          <span data-chip>
            <FingerboardChip sessions={trainingSessions} />
          </span>
        )}
```

After:
```tsx
        {fingerboardSessions.length > 0 && (
          <span data-chip>
            <FingerboardChip sessions={fingerboardSessions} />
          </span>
        )}
        {strengthSessions.length > 0 && (
          <span data-chip>
            <StrengthChip sessions={strengthSessions} />
          </span>
        )}
```

The FB chip now receives only fingerboard sessions, so its `×N` count reflects fingerboard count alone (previously it would have over-counted if strength rows ever existed).

- [ ] **Step 6: Type-check**

Run: `pnpm build`

Expected: build succeeds.

- [ ] **Step 7: Manual browser verification**

Run: `pnpm dev`

In a browser:

1. Open `/log`.
2. Confirm four buttons appear in the action row: orange `+`, primary `✓`, gray "FB", gray Barbell. All four `flex-1` and visually balanced.
3. Tap the Barbell button. Confirm a gray chip with a Barbell icon and `×1` appears in the chip list, next to (or instead of) the FB chip.
4. Tap the Barbell button two more times. Confirm the chip count becomes `×3`.
5. Tap the chip. Confirm the count decreases by one (most-recent session removed).
6. Tap the FB button. Confirm an FB chip with `×1` appears alongside the Strength chip — both visible at once, FB first, Strength second.
7. Navigate to `/journey` (or wherever the year calendar renders). Confirm today's cell shows the training half-triangle treatment (since at least one training session exists) and is not visually broken.
8. Navigate to `/analytics`. Confirm `RecentMonths` renders today as a training day (half-triangle / Moon-in-empty-half) and is not visually broken.

- [ ] **Step 8: Commit**

```bash
git add src/components/log/climb-list.tsx
git commit -m "feat(log): add strength chip alongside fingerboard chip"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Implemented in |
|---|---|
| Schema widening | Task 1 |
| Mutation widening | Task 2 |
| Fourth Barbell action button | Task 3 + 4 |
| `handleLogStrength` in LogPage | Task 4 |
| `StrengthChip` next to FingerboardChip | Task 5 |
| Click-to-delete on strength chip | Task 5 (mirrors FingerboardChip's `removeTraining`) |
| Heatmap unchanged | No task — spec confirms `trainingByDate` already aggregates regardless of type |

**Placeholder scan:** No TBDs, no "implement later", no untyped error handlers. Every code change is shown verbatim.

**Type consistency:**
- `onStrength: () => void` is declared in `ActionButtonsProps` (Task 3) and passed in `/log` (Task 4) under the same name.
- `StrengthChip` uses the same `Doc<"trainingSessions">[]` shape as `FingerboardChip`.
- The literal `"strength"` is the same in schema (Task 1), mutation validator (Task 2), `handleLogStrength` call (Task 4), and the filter predicate in `ClimbList` (Task 5).
