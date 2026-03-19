# Analytics Page Redesign: Unified Narrative

## Problem

The current analytics page has four separate card-based sections (Journey, Pyramid, Hold Levels, Activity) that each tell a different story with no narrative thread connecting them. The page feels disjointed — like four dashboards stapled together rather than one cohesive view of climbing progression.

## Goal

Restructure the analytics page into a single continuous narrative that answers: **"How am I growing, and am I on track?"**

The page should flow as three chapters:
1. **Where I Am** — current skill snapshot
2. **How I Got Here** — historical progression and consistency
3. **What's Next** — light observations, not prescriptions

## Design Principles

- **Full journey as context, recent trends for action.** The lifetime data motivates; recent trends inform.
- **Observations, not prescriptions.** "Slopers are a grade behind" — not "do more slopers."
- **Intentional vagueness on pace.** Plateaus happen for real-life reasons. The journey celebrates milestones without analyzing pace.
- **One continuous scroll.** No card borders between sections. Subtle chapter labels and dividers create flow, not separation.

## Chapter 1: Where I Am

This chapter answers: "What kind of climber am I right now?"

### Pyramid (unchanged)

- Horizontal bar chart, one row per grade from V0 to goal grade
- Shows cumulative send counts
- Dashed outline for unsent goal grade
- Total climb count displayed above
- Represents the user's **skill-level fingerprint** — beginner, intermediate, etc. — not progress toward a goal

### Hold Type Summary (new)

- Compact inline display directly below the pyramid: three items showing current level per hold type (e.g., Jug: V4, Crimp: V4, Sloper: V3)
- Derived from the existing `holdTypeBreakdown` query (last 90 days). The query uses a waterfall: highest grade with 2+ sends → highest grade with 1 send → suggested start grade (goal minus 3). The summary displays whatever the query returns without distinguishing between these tiers.
- Replaces the full hold type timeline in this section — the timeline is historical data and moves to Chapter 2

### What changes from current

- Hold type current levels extracted from the timeline component into a compact summary
- Pyramid and hold types presented together as one "current state" snapshot
- No card border — flows directly into Chapter 2

## Chapter 2: How I Got Here

This chapter answers: "What's my story — milestones, progression, consistency?"

### Journey Timeline (unchanged)

- Horizontal progress bar with milestone markers for each grade's 3rd send
- Injury gap markers for 14+ day breaks
- Start/end date labels
- Intentionally vague on pace — celebrates milestones without analyzing time between them

### Hold Type Timelines (moved from current position)

- Three horizontal timelines (jug, crimp, sloper) showing grade milestone dates
- Shared month axis across all three
- Color-coded grade badges on each timeline
- Previously adjacent to the pyramid; now positioned here because it's historical progression data

### Activity Heatmap (always visible)

- GitHub-style dot grid with grade-weighted colors
- No longer behind a toggle — it's part of the story, not an afterthought
- Clickable cells still navigate to the log page for that date
- Horizontal scroll, auto-scrolls to most recent

### What changes from current

- Hold type timelines move from between pyramid and activity to this chapter
- Activity heatmap is always visible (remove the toggle)
- All three pieces flow together: milestones achieved, across hold types, with this consistency

## Chapter 3: What's Next

This chapter answers: "What's true right now that I might want to act on?"

### Observations (new section)

- 2-3 short factual statements derived from the data
- Simple bullet list with small colored dots — minimal styling
- Replaces the existing coach card nudges with a lighter, non-prescriptive tone

### Observation types (waterfall priority)

Evaluate in order. Take the first 3 that fire.

1. **Recent milestone** — a hold type reached a new grade (3rd send) within the last 30 days. E.g., "Hit V4 on crimps this month." Source: `holdTypeTimelines` milestone dates.
2. **Hold type imbalance** — one hold type's current level is 1+ grades below the highest hold type level. E.g., "Slopers are a grade behind jugs and crimps." Source: `holdTypeBreakdown` `gradeLevelIdx` comparison. Skipped if all three are equal.
3. **Consistency** — count weeks with at least 1 climb in the last 12 weeks. E.g., "Active 10 of the last 12 weeks." Source: `heatmapData` bucketed into ISO weeks.
4. **Goal proximity** — sends at the goal grade from the pyramid. E.g., "0 V5 sends — next milestone on the journey." Source: `pyramid` top row sends count.
5. **Volume shift** — compare total climbs in the last 4 weeks vs. the prior 4 weeks. Only fires if the difference is 25%+. E.g., "Climbing more than usual lately" or "Volume has dipped recently." Source: `heatmapData` counts.

### Rules

- Maximum 3 observations displayed
- Waterfall: evaluate types 1-5 in order, take the first 3 that match
- Observations should not restate what's visually obvious from Chapter 1 without adding interpretation (e.g., hold type imbalance adds "a grade behind" framing on top of the raw numbers)
- Tone is factual: state what's true, let the user draw conclusions
- No imperatives ("try," "focus on," "you should")

## Layout

- The current page uses a fixed-height container with `overflow-hidden`. Change to `overflow-y-auto` to support continuous scrolling.
- Goal grade selector: currently managed as localStorage state in `analytics.tsx`. Keep the selector accessible — place it at the top of the page above Chapter 1 (small, inline, not a card).

## Visual Design

- No card borders between sections — one continuous scroll
- Chapter labels: small uppercase text with subtle letter-spacing (e.g., "WHERE I AM")
- Chapter dividers: thin horizontal rule in the existing beige palette
- Existing color system and typography preserved throughout
- Mobile-first layout (single column, same as current)
- Loading states: each chapter renders independently as its queries resolve. Use subtle fade-in rather than skeleton placeholders since there are no card borders to hold space.

## Empty State

- Users with fewer than 10 climbs: show a simple centered message encouraging them to log climbs, with the page structure hidden. No need to render empty chapters.
- Hold types with no sends: display "—" instead of a grade in the hold type summary.

## Data Changes

### Existing queries used as-is
- `api.analytics.pyramid` — Chapter 1 pyramid
- `api.analytics.holdTypeBreakdown` — Chapter 1 hold type summary
- `api.analytics.timelineMilestones` — Chapter 2 journey
- `api.analytics.holdTypeTimelines` — Chapter 2 hold type timelines
- `api.analytics.heatmapData` — Chapter 2 activity grid

### New: client-side observations hook
- No new Convex query. Observations are computed client-side in a `useObservations(goalGrade, pyramidData, holdTypeData, heatmapData, timelineData)` hook that takes the results of the existing queries as inputs. This avoids duplicating DB queries (Convex queries cannot call other queries) and keeps observation logic testable.

### Queries no longer used on analytics page
- `api.analytics.coachNudges` — replaced by observations
- `api.analytics.weeklyHighlights` — subsumed by observations (milestone type)
- `api.analytics.weeklyZones` — not part of redesigned page (was already unused)

## Components

### Modified
- `analytics.tsx` — page layout: remove card wrappers, add chapter structure, remove heatmap toggle, add observations section
- `pyramid.tsx` — minor: remove any card-level wrapper styling
- `journey-timeline.tsx` — minor: remove any card-level wrapper styling
- `hold-type-timeline.tsx` — minor: remove any card-level wrapper styling
- `activity-heatmap.tsx` — minor: remove any card-level wrapper styling, always render. Note: the `useEffect` that auto-scrolls the heatmap to the right should use `{ behavior: 'instant' }` to avoid conflicting with page scroll position on load.

### New
- `hold-type-summary.tsx` — compact inline display of current level per hold type
- `observations.tsx` — renders 2-3 factual observation bullets
- `use-observations.ts` — client-side hook computing observations from existing query results

### Unchanged (no modifications needed)
- `hold-type-ring.tsx` — not used on analytics page
- `coach-card.tsx` — no longer rendered on analytics page (keep for potential use elsewhere)
- `highlights-card.tsx` — no longer rendered on analytics page
- `weekly-zones.tsx` — not used on analytics page

## Out of Scope

- Per-hold-type pyramids (discussed and rejected — too much information)
- Pace analysis on the journey timeline (intentionally vague)
- Prescriptive coaching nudges (replaced by observations)
- Changes to the log page
- Changes to the data model or climbs table
