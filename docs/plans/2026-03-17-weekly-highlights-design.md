# Weekly Highlights Design

## Philosophy

Replace the prescriptive weekly zones (fixed targets) with a celebratory highlights reel that surfaces positive progression signals. The coach handles warnings and corrections; highlights stay purely positive.

## Highlight Types

Three highlight types, evaluated in priority order. The `weeklyHighlights` query returns all matching highlights ranked by priority.

| Priority | Type | Key | Trigger | Message Pattern |
|----------|------|-----|---------|-----------------|
| 1 | Grade consistency milestone | `milestone` | All-time send count at a grade crosses the 3-send threshold during this week | "V4 locked in — 3 consistent sends" |
| 2 | Hold type level-up | `holdup` | Highest grade with 2+ sends for a hold type improved this week vs last week | "Sloper level up: V2 → V3" |
| 3 | Send rate improvement | `sendrate` | Any build/project grade send rate improved 10+ percentage points this week vs last week (min 3 attempts both weeks) | "V3 send rate: 50% → 72%" |

If no highlights match, return a neutral fallback: "Keep climbing — highlights build as the week goes."

## Data Fetching

The query needs two data sets:
- **All-time climbs:** To detect grade consistency milestones (whether the 3rd send at a grade happened this week)
- **This week + last week climbs:** For send rate comparison and hold type level-up detection

Uses existing `getStartOfWeek()` helper for week boundaries.

## UI Layout

### Log Page — Side by Side

Coach card and highlights card share the top row, each 50% width:
- **Coach card (left):** Same content as now (1-2 nudges with dots), just narrower
- **Highlights card (right):** Single standout highlight (top priority) with a small icon. Cycles through if multiple highlights exist. Same card styling (border-2, rounded-lg, bg-card-bg)
- If no highlights this week, show neutral fallback message

### Analytics Page — Replaces Weekly Zones

Full highlights list replacing the weekly zones card:
- Title: "This Week"
- Shows all matching highlights, each as a single line with a colored type indicator
- Same card styling as other analytics cards
- If no highlights, show neutral fallback

## Implementation Scope

### Backend (`convex/analytics.ts`)
- New `weeklyHighlights` query accepting `{ goalGrade: v.string() }`
- Returns `{ highlights: { message: string; type: "milestone" | "holdup" | "sendrate" }[] }`

### Frontend — New
- `src/components/analytics/highlights-card.tsx` — full and compact variants

### Frontend — Modify
- `src/routes/log.tsx` — split top row: coach 50%, highlights 50%
- `src/routes/analytics.tsx` — replace `WeeklyZones` with full `HighlightsCard`

### Remove
- `WeeklyZones` import from analytics page (keep component file)

### No Changes To
- Coach card logic or content
- Schema
- Other analytics components (pyramid, hold type ring, journey timeline, heatmap)
