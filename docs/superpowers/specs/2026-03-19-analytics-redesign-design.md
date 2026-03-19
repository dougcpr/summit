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
- Derived from the existing `holdTypeBreakdown` query (highest grade with 2+ sends per hold type, last 90 days)
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

### Observation types (prioritized)

1. **Hold type imbalance** — one hold type lagging behind others (e.g., "Slopers are a grade behind jugs and crimps")
2. **Consistency** — streak or gap observation (e.g., "Active 10 of the last 12 weeks")
3. **Goal proximity** — distance to next grade milestone (e.g., "0 V5 sends — next milestone on the journey")
4. **Recent milestone** — if a grade was hit recently (e.g., "Hit V4 on crimps this month")
5. **Volume shift** — training more or less than recent baseline

### Rules

- Maximum 3 observations displayed
- Prioritize by what's most actionable/interesting
- Tone is factual: state what's true, let the user draw conclusions
- No imperatives ("try," "focus on," "you should")

## Visual Design

- No card borders between sections — one continuous scroll
- Chapter labels: small uppercase text with subtle letter-spacing (e.g., "WHERE I AM")
- Chapter dividers: thin horizontal rule in the existing beige palette
- Existing color system and typography preserved throughout
- Mobile-first layout (single column, same as current)

## Data Changes

### Existing queries used as-is
- `api.analytics.pyramid` — Chapter 1 pyramid
- `api.analytics.holdTypeBreakdown` — Chapter 1 hold type summary
- `api.analytics.timelineMilestones` — Chapter 2 journey
- `api.analytics.holdTypeTimelines` — Chapter 2 hold type timelines
- `api.analytics.heatmapData` — Chapter 2 activity grid

### New query needed
- `api.analytics.observations` — Chapter 3 observations. Derives 2-3 factual statements from existing data: hold type gaps (from `holdTypeBreakdown`), consistency stats (from `heatmapData`), goal proximity (from `pyramid`), recent milestones (from `holdTypeTimelines`), volume trends (from `heatmapData`).

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
- `activity-heatmap.tsx` — minor: remove any card-level wrapper styling, always render

### New
- `hold-type-summary.tsx` — compact inline display of current level per hold type
- `observations.tsx` — renders 2-3 factual observation bullets

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
