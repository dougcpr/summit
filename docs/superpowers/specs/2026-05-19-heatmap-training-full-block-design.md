# Heatmap Training Full-Block — Design

**Date:** 2026-05-19
**Status:** Approved for planning

## Summary

Render training-only days (fingerboard and/or strength) as a full color block with a centered icon, instead of the current half-triangle (colored bottom-right, empty top-left, icon in top-left). The half-triangle was originally meant to suggest "rested from climbing, trained X" but in practice the user found the empty half visually noisy. A solid block reads cleaner and lets color carry the meaning (indigo = FB, yellow = strength).

## Motivation

User tested the strength-distinct heatmap and concluded the half-rest/training split is unnecessary visual complexity. Climb days already use solid blocks; making training days solid too gives the whole heatmap a consistent "color = activity" language.

## Rendering Matrix

| Day state | Fill | Icon |
|---|---|---|
| Rest | empty | Moon, centered |
| Fingerboard only | indigo (`TRAINING_FILL`) | Moon, centered |
| **Strength only** | yellow (`STRENGTH_FILL`) | Barbell, centered |
| **Fingerboard + strength** | indigo (FB wins) | Barbell, centered (strength wins icon) |
| Climb (any combo) | solid grade color | — |
| Goal date | checkered overlay | — |
| Competition date | gold tint | Trophy, centered |

The icon rule is unchanged from before: Moon when only fingerboard, Barbell whenever strength is present.

The color rule is unchanged: indigo when fingerboard is present (with or without strength), yellow only when strength is present without fingerboard.

## Implementation

Two files, parallel changes: `src/components/analytics/year-calendar.tsx`, `src/components/analytics/recent-months.tsx`.

### Training branch — drop the gradient

Where the training branch currently builds a `linear-gradient(135deg, EMPTY_COLOR 0 50%, fill 50% 100%)` and sets `bg = "transparent"`, change it to set `bg = fill` directly. No `backgroundImage` (for year-calendar, no assignment to `splitGradient`).

Pseudocode after the change:

```ts
} else if (hasTraining) {
  const fill = hasFingerboard ? TRAINING_FILL : STRENGTH_FILL;
  const borderColor = hasFingerboard ? "rgba(107,92,196,0.4)" : "rgba(245,158,11,0.5)";
  bg = fill;
  if (!isToday) border = `1px solid ${borderColor}`;
}
```

### Icon — centered, larger, more opaque

The current training-icon block uses `absolute` positioning, small size, and `opacity-30`/`opacity-40` to sit subtly in the empty top-left half. Now that the icon sits over a colored block, it needs to be visible:

- Drop `absolute` and the `style={{ top, left }}` offset. The cell's `flex items-center justify-center` will center the icon naturally.
- Year-calendar: size `6` (matches the rest-day Moon).
- Recent-months: size `8` (matches the rest-day Moon).
- Opacity: `opacity-50` for both Moon and Barbell variants. Higher contrast against the colored fill, while still subordinate to the cell color.

### Comp-date and goal-date interactions

Year-calendar's comp-date override currently checks `if (splitGradient) { backgroundImage = undefined; backgroundSize = undefined; }`. After this change, `splitGradient` is no longer assigned in the training branch, so that check is dead. **Out of scope:** removing the `splitGradient` plumbing. The dead branch is harmless (it just doesn't fire) and removing it touches the comp-date logic, which is independent of this feature. A follow-up cleanup commit can address it if a reviewer flags it again.

Goal-date checkered pattern is unaffected — it still assigns `backgroundImage` directly. The training branch no longer fights for that prop.

## Out of Scope

- Removing `splitGradient` / dead comp-date `if (splitGradient)` branch from year-calendar (cleanup, not required for the feature).
- Changes to climb cells.
- Changes to rest-day Moon (already centered).
- Changes to color or border values for any state.
- Icon color overrides (keep `currentColor` via Phosphor default).

## Migration / Deploy

No backend changes. No schema changes. No Convex deploy needed.
