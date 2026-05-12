# Fingerboard Logging — Design

**Date:** 2026-05-11
**Status:** Approved for planning

## Summary

Add the ability to log fingerboard (hangboard) training sessions on rest days from the Log page. Each tap records one session for the selected date; multiple sessions per day are supported. Counts appear on the Year Calendar so the user can see their off-day training at a glance.

The data model is designed to extend to other off-day training types (e.g. weights) without schema changes.

## Motivation

The user follows a 4:1 work:rest schedule and uses rest weeks for fingerboard training (1 or 2 sessions per day). Climbs and fingerboard are conceptually different activities — fingerboard is off-day work, not part of the climbing-grade progression. The user wants:

- A fast way to log a session.
- A visible count on the calendar.
- Visual separation from climb logging so fingerboard does not compete with the main climb action flow on climbing days.

## Data Model

New Convex table `trainingSessions`:

```ts
trainingSessions: defineTable({
  userId: v.string(),
  type: v.union(v.literal("fingerboard")),
  trainedAt: v.number(),
}).index("by_user_date", ["userId", "trainedAt"])
```

- One row per session. Two sessions on one day = two rows.
- `trainedAt` normalized to noon (same convention as `climbs.climbedAt`, using `normalizeToNoon`).
- `type` is a discriminated union from day one so adding `"weights"` later only requires expanding the union — no migration.

Rationale: A counter column would force a parallel date table or require denormalization. Rows are simpler, mirror the climbs pattern, and make per-session deletion natural.

## Backend (Convex)

New file `convex/training.ts` with:

- `getByDate({ startTime, endTime })` — returns sessions for the date range and current user, ordered desc.
- `add({ type, trainedAt })` — inserts one row scoped to the current user.
- `remove({ id })` — deletes one row after verifying ownership.

These mirror the shape of `convex/climbs.ts`. Unlike climbs, **no analytics cache recompute** is scheduled — training does not feed the grade pyramid, hold-type analytics, or goal-grade calculation.

New query in `convex/analytics.ts`:

- `trainingByDate()` — returns `{ date: "YYYY-MM-DD", count: number }[]` for the current user across all time, used by the Year Calendar. Implementation: scan training sessions, bucket by local-date string, count.

## Log Page Changes

### Third action button

`src/components/log/action-buttons.tsx` grows from two buttons to three:

| Button | Color | Content |
|---|---|---|
| Attempt | `#d96c4f` | Phosphor `Plus` icon |
| Send | `var(--color-primary)` (yellow) | Phosphor `Check` icon |
| Fingerboard | `#4a4a52` (graphite) | Text "FB" in display font, white |

All three remain `flex-1` in the same row. The FB button text uses bold weight to match the visual weight of the Plus/Check icons.

### Wire-up in `src/routes/log.tsx`

- Add `useMutation(api.training.add)` and `useQuery(api.training.getByDate, { startTime, endTime })` alongside the existing climbs hooks.
- New handler `handleLogTraining()` calls `add({ type: "fingerboard", trainedAt: normalizeToNoon(selectedDate) })`.
- Pass `onTraining` to `ActionButtons`.

### Fingerboard chip in the chip row

The existing `src/components/log/climb-list.tsx` renders climb chips. Add a fingerboard chip alongside, rendered when the day has any sessions:

- Style: graphite background (`#4a4a52`), white text "FB ×N" where N is the session count.
- Tap behavior: deletes the **most recent** session for that day (calls `api.training.remove` with the latest session's `_id`). When N reaches 0 the chip disappears.
- Position: rendered after the climb chips in the same horizontal scroller, so climb chips keep their existing order and the FB chip trails them. The hidden-count indicator at the right edge continues to work unchanged.

Implementation choice: extend `ClimbList` to also accept training sessions, rather than introducing a separate component. The two render in one scrollable row and the overflow indicator already handles both.

### TodaySummary

No change. The "X/Y (Z%)" stat is climb-specific (sends over total). The FB chip carries the fingerboard count.

## Year Calendar Treatment

`src/components/analytics/year-calendar.tsx` reads the new `trainingByDate` query.

For each day cell, decide its rendering tier:

1. **Fingerboard-only day** (no climbs, has fingerboard):
   - Light background fill (`rgba(74, 74, 82, 0.12)`).
   - Dot pattern overlay: `radial-gradient(#4a4a52 1px, transparent 1.4px)` at 5px tile.
   - Count rendered in top-right corner of the cell using a small bold number (`text-[6px]`, color `#4a4a52`).
   - The existing rest-day moon icon does **not** appear — a fingerboard day is not a rest day.

2. **Climb day + fingerboard** (has both):
   - Existing grade-colored fill is preserved unchanged.
   - Session count rendered in the top-right corner of the cell (no circle background — calendar cells are too small to host a legible dot-with-number on top of an existing fill).
   - Color: white for grades in the existing `lightTextGrades` set (V4, V5, V6, V7, V8, V10) and `#4a4a52` for the others, mirroring how grade letters pick text color.
   - Size: `text-[6px]` bold, matching the smallest text used elsewhere on the cell (month labels are `text-[6px]`, day headers `text-[4px]`).

3. **Climb day only**: unchanged.

4. **Rest day** (no climbs, no fingerboard, within journey range): unchanged — moon icon as today.

5. **Future day, today border, goal date, competition date**: all existing treatments preserved. The fingerboard overlay sits *on top of* these.

## Activity Heatmap

`src/components/analytics/activity-heatmap.tsx` — **no change**. That visualization aggregates weeks by average climbing grade. Mixing fingerboard would dilute the question it answers ("am I progressing on climbs?"). Fingerboard signal lives only on the Year Calendar.

## Color Reference

| Use | Value |
|---|---|
| FB button background | `#4a4a52` |
| FB chip background | `#4a4a52` |
| FB chip text | white |
| FB-only day overlay color | `#4a4a52` over `rgba(74,74,82,0.12)` light fill |
| FB count corner (FB-only day) | `#4a4a52`, `text-[6px]` bold |
| FB count (combo day) | white text for dark-grade fills, `#4a4a52` for light-grade fills |

These values are inline in the components (matching how climb/grade colors are handled today). If they end up reused beyond this feature, promote to `src/lib/grades.ts` or a new `src/lib/training.ts`.

## Files Touched

- `convex/schema.ts` — add `trainingSessions` table.
- `convex/training.ts` — new file with `getByDate`, `add`, `remove`.
- `convex/analytics.ts` — add `trainingByDate` query.
- `src/components/log/action-buttons.tsx` — add third button.
- `src/components/log/climb-list.tsx` — accept training sessions, render FB chip in the same row.
- `src/components/analytics/year-calendar.tsx` — read training data, render FB-only and combo-day treatments.
- `src/routes/log.tsx` — add training mutation/query hooks and handler.

## Out of Scope

- Weights button and other training types (data model is ready; UI is future work).
- Including fingerboard in the grade pyramid, observations, hold-type analytics, or goal-grade calculation.
- Streaks, weekly targets, or any goal tracking for fingerboard.
- Notes per fingerboard session.
- Showing fingerboard on the Activity Heatmap.

## Success Criteria

- Tapping the FB button on the Log page records a session for the selected date.
- Multiple taps record multiple sessions.
- A "FB ×N" chip appears in the chip row when the day has any sessions; tapping removes one.
- The Year Calendar shows the session count on days with fingerboard activity, distinct from climb days, with a treatment that works whether the day also has climbs or not.
- The Activity Heatmap, grade pyramid, and other climb-grade analytics are unaffected.
