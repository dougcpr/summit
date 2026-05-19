# Heatmap Strength Distinction — Design

**Date:** 2026-05-19
**Status:** Approved for planning

## Summary

Distinguish strength training visually on the analytics heatmaps (Year Calendar and Recent Months). Strength days get a yellow half-triangle and a Barbell icon, mirroring the existing fingerboard treatment but with a different color and glyph. As a deliberate simplification, climb days revert to a solid grade-color block — the recent climb+fingerboard diagonal split is rolled back. Climb supersedes all training visuals.

## Motivation

The user logs three activities: climbing, fingerboard, and (now) strength. The current heatmap bundles fingerboard and strength as undifferentiated "training." After living with it, the user wants strength visually distinct so they can scan for weight-work consistency at a glance. They also concluded that the climb+training diagonal split clutters climb days — climbing is the headline activity, and training on a climb day shouldn't compete with the grade indicator.

## Rendering Matrix

| Day state | Bottom-right half | Top-left half | Icon |
|---|---|---|---|
| Rest | empty bg | empty bg | Moon, centered |
| Fingerboard only | indigo (`TRAINING_FILL`) | empty | Moon, top-left |
| **Strength only** | **yellow (`STRENGTH_FILL`)** | empty | **Barbell, top-left** |
| **Fingerboard + strength** | indigo (fingerboard wins) | empty | **Barbell, top-left** |
| Climb (alone) | solid grade color | — | — |
| **Climb + fingerboard** | **solid grade color** | — | — |
| **Climb + strength** | **solid grade color** | — | — |
| **Climb + fingerboard + strength** | **solid grade color** | — | — |
| Goal date | checkered overlay | — | — |
| Competition date | gold tint | — | Trophy |

Rules:
- **Bottom-right color**: indigo if fingerboard is present (whether or not strength is also present); yellow only if strength is present without fingerboard.
- **Icon**: Barbell whenever strength is present (overrides Moon); Moon if only fingerboard; Moon centered on rest.
- **Climb wins**: any climb session collapses the cell to a solid grade block; training colors and icons are hidden.

## Color

New constant `STRENGTH_FILL = "rgba(245, 158, 11, 0.5)"` (tailwind amber-500 at 0.5 alpha). Distinct from the existing `rgba(228, 196, 77, 0.25)` competition tint (paler, lower alpha) and the indigo training fill.

The strength-day border, if non-today, matches the fill's hue: `"1px solid rgba(245, 158, 11, 0.5)"`.

## Backend

`convex/analytics.ts` — `trainingByDate` extends its per-date entry to include the training composition:

```ts
return Object.entries(byDate).map(([date, { count, hasFingerboard, hasStrength }]) =>
  ({ date, count, hasFingerboard, hasStrength })
);
```

The aggregation loop sets `hasFingerboard ||= (s.type === "fingerboard")` and `hasStrength ||= (s.type === "strength")` per session. `count` stays for backward compatibility but is no longer used by the heatmap renderers.

No new caches or schema fields. The existing `trainingByDate` is uncached, so the change is purely additive on the return shape.

## Frontend

Two files: `src/components/analytics/year-calendar.tsx` and `src/components/analytics/recent-months.tsx`. The changes are parallel.

**Type:** widen `TrainingEntry` from `{date: string; count: number}` to `{date: string; count: number; hasFingerboard: boolean; hasStrength: boolean}`.

**Per-date lookup:** replace `trainingMap: Map<string, number>` with `Map<string, {hasFingerboard: boolean; hasStrength: boolean}>`. The `hasTraining` boolean is derived as `info && (info.hasFingerboard || info.hasStrength)`.

**Cell branch logic:**

```ts
if (isFuture) {
  bg = "rgba(128,128,128,0.08)";
} else if (hasClimb) {
  const grade = GRADES[count - 1];
  if (grade) {
    bg = colorMap[grade];                // always solid — no diagonal split
    if (!isToday) border = "1px solid rgba(128,128,128,0.15)";
  }
} else if (hasTraining) {
  const fill = info.hasFingerboard ? TRAINING_FILL : STRENGTH_FILL;
  const borderColor = info.hasFingerboard ? "rgba(107,92,196,0.4)" : "rgba(245,158,11,0.5)";
  splitGradient = `linear-gradient(135deg, ${EMPTY_COLOR} 0 50%, ${fill} 50% 100%)`;
  bg = "transparent";
  if (!isToday) border = `1px solid ${borderColor}`;
}
```

**Icon swap:**

```tsx
{hasTraining && !hasClimb && !isCompDate && !isFuture && (
  info.hasStrength
    ? <Barbell size={5} weight="fill" className="absolute opacity-40" style={{ top: 0, left: 0 }} />
    : <Moon size={5} weight="fill" className="absolute opacity-30" style={{ top: 0, left: 0 }} />
)}
```

Barbell uses slightly higher opacity (`opacity-40`) so the icon reads clearly against the yellow/empty top-left at small sizes. Tune in `recent-months.tsx` to match its larger icon size (was `Moon size={6}` → `Barbell size={6}`).

**Climb branch cleanup:** the previous `if (hasTraining) { splitGradient = ... }` inside the climb branch is removed in both files. The `splitGradient` local can be retained because the training branch still uses it.

## Out of Scope

- Per-type session counts in the heatmap (we only need booleans now).
- Visual treatment for climb+training days (climb wins — no training visual at all).
- Recoloring the strength chip on the Log page (chip styling on `/log` is independent and stays gray).
- Changing the Log page's action buttons.
- A legend on the heatmap.
- Animation between states.

## Migration Notes

`trainingByDate` is uncached, so deploying the function change is enough. No data migration. The widened return shape is backward compatible at the schema layer — only consumers (Year Calendar, Recent Months) need to update.

After landing, run `npx convex dev --once` to deploy. (This is the lesson from the prior strength-tracking landing: `pnpm build` only checks the frontend; Convex backend needs its own deploy step.)
