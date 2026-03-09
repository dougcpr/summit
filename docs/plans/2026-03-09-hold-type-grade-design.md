# Hold Type Grade Analysis

## Summary

Replace volume-based hold type analysis with grade-level-per-hold-type. Show the highest grade with 3+ sends for each hold type, and make the coach nudge grade-aware.

## Metric

For each hold type (jug, crimp, sloper), find the highest grade where the user has 3 or more completed sends (all time). This filters out lucky one-offs and reflects reliable level.

## Analytics Visual

Replace the hold type donut ring with grade-level rows:

```
  Jug       V5
  Crimp     V4
  Sloper    V3  ← weakest
```

Weakest hold type row gets a subtle highlight or "focus" label.

## Coach Nudge

Secondary nudge becomes grade-aware. Instead of "try more slopers" (volume), show:

> "Slopers at V3 — try a V3 sloper send"

Identifies weakest hold type by grade level (not volume) and suggests working at that grade.

## Backend

Update `holdTypeBreakdown` query to compute grade-per-hold-type. Return `{ types: [{ type, gradeLevel }], weakest: string }`.

Update coach nudge hold type logic to use grade-level comparison.

## Files Changed

- `convex/analytics.ts` — update `holdTypeBreakdown`, update coach nudge hold type logic
- `src/components/analytics/hold-type-ring.tsx` — replace donut with grade-level rows
