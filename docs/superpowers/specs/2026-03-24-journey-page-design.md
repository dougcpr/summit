# Journey Page & Analytics Restructuring

## Problem

The Analytics page has too much content for a single screen. The pyramid, hold calculator, journey timeline, hold type timeline, and activity heatmap compete for space, making everything cramped.

## Solution

Split Analytics into two focused pages:

- **Analytics** — Where you are now (Pyramid + Hold Levels)
- **Journey** — How you got here + year-at-a-glance calendar

## Navigation

Update the bottom tab bar and desktop sidebar from 3 to 4 items:

```
Log | Journey | Analytics | Logout
```

- Journey icon: `Compass` from `@phosphor-icons/react`
- Order: Log, Journey, Analytics, Logout
- Same active/inactive styling as existing tabs

### Files changed

- `src/routes/__root.tsx` — add Journey link between Log and Analytics

### New route

- `src/routes/journey.tsx` — new route component

## Analytics Page (slimmed down)

`src/routes/analytics.tsx`

Remove How I Got Here and Activity sections. Keep:

1. **Focus** — rest/work coaching status (top)
2. **Where I Am** — Pyramid visualization (top half)
3. **Hold Levels** — Hold type breakdown/timeline (bottom half)

The two main sections get a 50/50 vertical split, giving each more room to breathe. Container keeps the existing `justify-evenly` flex layout.

### Components retained on Analytics

- `Focus` (unchanged)
- `Pyramid` (unchanged)
- `HoldTypeTimeline` (unchanged — repurposed as "Hold Levels" section)

### Components removed from Analytics

- `JourneyTimeline` — moves to Journey page
- `ActivityHeatmap` — replaced by year calendar on Journey page

## Journey Page (new)

`src/routes/journey.tsx`

Two sections:

### Section 1: How I Got Here

Reuses existing components with no changes:

- `JourneyTimeline` — grade milestone timeline with progress bar
- `HoldTypeTimeline` — per-hold-type milestone grid

### Section 2: Year at a Glance

New component: `src/components/analytics/year-calendar.tsx`

#### Layout

- 3 columns x 4 rows grid of month blocks
- Each month block: month name header + 7-column day grid (SU–SA)
- Day cells: small squares, aspect-ratio 1:1

#### Year navigation

- Header row: `< 2026 >` with left/right arrow buttons
- Tapping `<` goes to previous year, `>` goes to next year
- Disable `>` when viewing current year (no future years)
- Earliest navigable year: year of the user's first climb

#### Day cell coloring

- **Active day**: colored by average grade using existing `colorMap` from `src/lib/grades.ts`
- **Inactive day** (no climbs): cream `#f6f1e3`
- **Future day**: slightly faded/muted (lower opacity or lighter background)
- **Border**: subtle `rgba(59,59,59,0.1)` on active cells for definition

#### Data source

Reuses `api.analytics.heatmapData` query. This already returns per-day entries with date and average grade count. The component filters entries by the selected year and maps them into the calendar grid.

No backend changes required.

#### State

- `selectedYear`: local React state, defaults to current year
- Lookup map: `Map<string, number>` keyed by `YYYY-MM-DD` date string for O(1) cell lookup

## Empty state

Both pages share the same empty state check (< 10 climbs logged). Each page handles this independently using the same pattern as the current analytics page.

## What doesn't change

- All existing components (Pyramid, JourneyTimeline, HoldTypeTimeline, Focus) — no modifications
- Backend queries — no changes to Convex functions
- Color system, grade config — unchanged
- Authentication, caching — unchanged
