# Strength Tracking — Design

**Date:** 2026-05-19
**Status:** Approved for planning

## Summary

Add strength-training (weights) logging to the Log page, mirroring the existing fingerboard pattern. One tap records one session for the selected date. A Barbell-icon chip joins the existing FB chip in the log page chip list. On analytics heatmaps, strength sessions count toward "training days" alongside fingerboard — no new visual category.

The fingerboard design (2026-05-11) anticipated this extension: the `trainingSessions.type` field is a discriminated union, so adding a second variant is a non-breaking widening.

## Motivation

The user splits training time between climbing, fingerboard hangs, and weight work. Fingerboard is already logged; weight work is currently invisible. Goals:

- Fast, single-tap logging from the Log page.
- Visual separation from fingerboard so the user can read a day's training mix at a glance.
- No analytics complexity — strength is a "training day" like fingerboard for heatmap purposes.

## Data Model

Widen the `trainingSessions.type` union in `convex/schema.ts`:

```ts
type: v.union(v.literal("fingerboard"), v.literal("strength"))
```

Widen the same union in `convex/training.ts`'s `add` mutation validator. No migration is needed — existing rows already carry `type: "fingerboard"`.

## Backend

`convex/training.ts` — only the `add` validator changes. `getByDate` and `remove` are type-agnostic and need no edits.

`convex/analytics.ts` — `trainingByDate` already aggregates regardless of type, so strength sessions automatically count toward training days on the heatmap. No edits.

## Log Page Changes

### Fourth action button

`src/components/log/action-buttons.tsx` grows from three buttons to four. The new strength button mirrors the FB button's visual treatment so they read as a pair of "training" actions:

| Button | Color | Content |
|---|---|---|
| Attempt | `#d96c4f` | Phosphor `Plus` icon |
| Send | `var(--color-primary)` | Phosphor `Check` icon |
| FB | `#4a4a52` | "FB" text |
| Strength | `#4a4a52` | Phosphor `Barbell` icon |

All four use `flex-1 py-4` — they share the row and get narrower equally. `ActionButtonsProps` gains `onStrength: () => void`.

### Strength chip in the log list

`src/components/log/climb-list.tsx` partitions `trainingSessions` by `.type`:

- `fingerboardSessions` → existing `FingerboardChip` (`"FB ×N"`, gray pill).
- `strengthSessions` → new `StrengthChip`. Same gray pill (`#4a4a52`), content is `<Barbell size={14} weight="bold" /> ×N` — the icon does the labeling, no "ST" text.

Click-to-delete behavior matches the FB chip: tap removes the most-recent strength session.

The chip list renders climbs, then fingerboard chip (if any), then strength chip (if any).

### LogPage wiring

`src/routes/log.tsx` adds `handleLogStrength`, which calls the existing `addTraining` mutation with `type: "strength"`. It is passed into `ActionButtons` as `onStrength`.

## Analytics — Unchanged

The `YearCalendar` and `RecentMonths` heatmaps consume the existing `trainingByDate` aggregate. Strength sessions silently roll into training-day counts:

- Strength-only day → empty/indigo half-triangle (same as fb-only).
- Climb + strength day → grade/indigo diagonal split (same as climb+fb).
- Climb + fb + strength day → grade/indigo diagonal split (training-side is indigo regardless of which trainings).

This is intentional: bundling keeps the visual language tight and matches the existing rest/train/climb taxonomy. If a future need emerges to break out strength visually, the data is already discriminated — it's a rendering change only.

## Out of Scope

- Sets, reps, weight, exercise name. The user explicitly chose one-tap-per-session.
- Strength-specific color or icon on the heatmap.
- Strength-specific analytics (frequency, streaks, breakdowns).
- Separate "training" chip that summarizes both types into one.
- Renaming "fingerboard" or "FB" anywhere.

## Open Questions

None at design time. All decisions made during brainstorming.
