# Heatmap Icon-Only Training — Design

**Date:** 2026-05-21
**Status:** Approved for planning

## Summary

Reduce the analytics heatmap to two visual languages: solid grade-color block for climb days, empty cell + centered icon for everything else. Training (fingerboard, strength, or both) is represented by a navy icon — no fill, no border tint, no half-triangle. Comp dates render a gold Trophy that always wins over training visuals.

## Motivation

The user lived with the half-triangle + colored training fills (most recently the `ad6a35d`/`81d65f6`/`9ca1e2e` work) and concluded the heatmap is trying to tell too much. The split triangle, two training fill colors, training borders, and the diagonal climb+training splits all compete for attention against the climb's grade color — which is the headline signal. They also reported a bug: on a comp+training day the Trophy wasn't visible, because comp gold + training half-triangle + Trophy icon were all stacked.

Goals:

1. **Climb is the headline.** Climb days are solid grade blocks. Training that happens to overlap a climb day is suppressed from the heatmap (the chip list on `/log` still shows it).
2. **Training is a quiet secondary signal.** A small navy icon in the center of an empty cell — same footprint as the rest-day Moon.
3. **Comp date wins over training.** The Trophy renders unconditionally on comp dates, with training icons suppressed.
4. **Strip dead state.** Drop unused fill constants and gradient plumbing left over from the previous iterations.

## Rendering Matrix

| Day state | Cell fill | Icon |
|---|---|---|
| Rest | empty (`EMPTY_COLOR`) | Moon, centered, gray, `opacity-20` |
| FB only | empty | LadderSimple, centered, navy, `opacity-50` |
| Strength only | empty | Barbell, centered, navy, `opacity-50` |
| FB + strength | empty | LadderSimple + "/" + Barbell, side-by-side, centered, navy, `opacity-50` |
| Climb only | solid grade color | — |
| Climb + fingerboard | solid grade color | — |
| Climb + strength | solid grade color | — |
| Climb + fingerboard + strength | solid grade color | — |
| Comp date *(any combination)* | gold tint `rgba(228,196,77,0.25)` + gold border | Trophy, centered, gold, `opacity-60` |
| Goal date | checkered overlay | — |
| Today | thick `border-color` 2px border (overlays whatever the underlying state is) | (per state above) |
| Future | dim gray cell | — |

**Icon precedence (when multiple icons would apply):**

1. Today border is independent — it sits on every state.
2. Goal date wins over everything except today's border.
3. Comp date wins over training (Trophy renders; training icons suppressed).
4. Training icons render only when no climb, no comp, no goal date, not future.
5. Rest-day Moon renders only when no climb, no training, no comp, no goal date, not future.

## Color

New constant in both heatmap files:

```ts
const TRAINING_ICON = "#1e3a8a"; // tailwind blue-900
```

Applied to the LadderSimple, Barbell, and the "/" separator via `style={{ color: TRAINING_ICON }}`.

Opacity: `opacity-50` (consistent with how training icons read against the empty cell — neither too loud nor invisible).

## Dead Code Removal

The following constants and variables are no longer used in the cell rendering branches and should be removed in the same commit as the rendering change:

**`year-calendar.tsx`:**
- `TRAINING_FILL` constant
- `STRENGTH_FILL` constant
- `let splitGradient: string | undefined;` declaration
- The `if (splitGradient)` guard inside the comp-date block at lines 195-198 (now always false)

**`recent-months.tsx`:**
- `TRAINING_FILL` constant
- `STRENGTH_FILL` constant
- (No `splitGradient` here — this file uses `backgroundImage` directly)

`EMPTY_COLOR` stays in both files (still used as the default bg).
`backgroundImage` stays in both files (still used by the goal-date checkered pattern in year-calendar; declared but unused in recent-months after this change — leave it for parity, similar to how `backgroundSize` was once handled).

## Implementation

`src/components/analytics/year-calendar.tsx` and `src/components/analytics/recent-months.tsx`.

### Cell rendering logic

The training and climb branches collapse to:

```ts
if (isFuture) {
  bg = "rgba(128,128,128,0.08)";
} else if (hasClimb) {
  const grade = GRADES[count - 1];
  if (grade) {
    bg = colorMap[grade];
    if (!isToday) border = "1px solid rgba(128,128,128,0.15)";
  }
}
// No training-fill branch — training is icon-only.
```

The training-only `else if (hasTraining)` branch is removed entirely. Training is purely a JSX icon.

### Icon JSX

For both files, the icon block becomes:

```tsx
{/* Comp date / goal date / today logic stays where it is */}
{isCompDate && !isGoalDate && (
  <Trophy size={6} weight="fill" className="opacity-60" style={{ color: "rgba(202, 164, 43, 1)" }} />
)}
{isRest && !isCompDate && (
  <Moon size={6} weight="fill" className="opacity-20" />
)}
{hasTraining && !hasClimb && !isCompDate && !isGoalDate && !isFuture && (
  hasFingerboard && hasStrength ? (
    <span className="flex items-center gap-px opacity-50" style={{ color: TRAINING_ICON }}>
      <LadderSimple size={4} weight="fill" />
      <span className="text-[5px] font-bold">/</span>
      <Barbell size={4} weight="fill" />
    </span>
  ) : hasFingerboard ? (
    <LadderSimple size={6} weight="fill" className="opacity-50" style={{ color: TRAINING_ICON }} />
  ) : (
    <Barbell size={6} weight="fill" className="opacity-50" style={{ color: TRAINING_ICON }} />
  )
)}
```

(Sizes shown above are for year-calendar. `recent-months.tsx` uses `size={8}` for single icons and `size={6}` each + `text-[7px]` slash for the combo. Trophy and Moon sizes stay at the per-file precedent.)

The training icon condition adds `!isGoalDate` — the goal-date checkered overlay shouldn't have icons fighting it. (Previously this guard was missing, which is a small bug fix bundled with this redesign.)

### Climb branch

The climb branch in both files reverts to the original "solid grade block" form. The three-way sub-conditional (`hasFingerboard` / `hasStrength` / else) added in `ad6a35d`/`81d65f6` is removed entirely.

## Trophy Bug Fix

Today: on a comp+training day, the comp-date block clears the diagonal `backgroundImage` (year-calendar) or leaves the colored fill standing (recent-months). The Trophy renders centered with `opacity-60`, but at small cell sizes it competes with the comp gold background and is hard to read. The user reported it as "trophy not highlighted over."

After this change:
- Comp+training days have a clean gold bg (no diagonal fight).
- The training icon is explicitly suppressed by `!isCompDate` in the JSX guard.
- Trophy is the only icon and reads clearly.

This isn't a new code branch — it's a side effect of dropping the training fill.

## Out of Scope

- Changing the log page action buttons or chips (FB button is still LadderSimple, strength is still Barbell, both unchanged).
- Changing the rest-day Moon.
- Changing goal-date or comp-date overrides (other than removing the dead `if (splitGradient)` guard).
- Changing the climb-only or future-day rendering.
- Changing fonts or pyramid/hold-level views.

## Migration / Deploy

Frontend only. No backend changes. No Convex deploy needed.
