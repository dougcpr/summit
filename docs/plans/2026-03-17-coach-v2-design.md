# Coach V2: Mirror + Nudge Design

## Philosophy

Shift from grade-chasing periodization to fundamentals-first, session-reactive coaching. The goal is "look seamless at your grade" — the coach observes recent performance and gives fast, actionable feedback that reinforces movement quality over grade progression.

## Core Changes

### 1. Data Windows — Session-Based Reactivity

Replace current 30-day and 14-day calendar windows with session-based analysis:

- **Short window (last 3 sessions):** Primary coaching input. Send rate per grade, attempt counts, hold type breakdown.
- **Medium window (last 10 sessions):** Trend detection. Enables regression alerts by comparing current performance to recent baseline.
- **Remove periodization entirely:** No training weeks, rest phases, cycle anchors, or ratio transition dates. The coach reacts to what it sees, session by session.

A "session" is defined as a distinct `climbedAt` date with at least one logged climb. Session grouping relies on `normalizeToNoon()` ensuring all climbs on the same day share the same timestamp.

**Fetch strategy:** Fetch the last 90 days of climbs (up from 30) to guarantee at least 10 sessions for users who climb 2-3x/week. Extract distinct `climbedAt` values, sort descending, take the 3 and 10 most recent.

### 2. Coaching Rules — Priority-Ordered Nudges

**Grade zones** (same as existing):
- **Build grades:** `goalIdx - 3` through `goalIdx - 2` (e.g., V2-V3 for a V5 goal)
- **Project grade:** `goalIdx - 1` (e.g., V4)
- **Goal/reach:** `goalIdx` and above (e.g., V5+)

Rules evaluate **per-grade** within the build zone (not aggregated across the zone). Each grade is checked independently — the first matching rule for any grade fires.

Primary nudge evaluates in order, picks first match:

| Priority | Rule | Trigger | Message Pattern |
|----------|------|---------|-----------------|
| 1 | Fatigue detection | Overall send rate (all grades combined) drops 15+ percentage points from 10-session baseline (sessions 4-10) to last 3 sessions | "Send rates dropping across the board — consider a rest day or easy session" |
| 2 | Grade overreach | Any build/project grade has send rate < 50% over last 3 sessions (min 3 attempts) | "V3s at 45% — focus on clean sends there before pushing up" |
| 3 | Regression alert | Any grade with 70%+ send rate over sessions 4-10 drops below 50% in last 3 sessions (min 3 attempts in each window) | "V3 crimp send rate dropped from 75% to 40% — something's off, revisit those" |
| 4 | Ready to push | All build grades at 70%+ send rate over last 3 sessions (min 3 attempts each) | "V4s looking smooth at 75% — try a V5 when it feels right" |
| 5 | Solid fallback | Nothing else triggers | "Base looks solid — keep building volume at V3/V4" |

**Minimum attempt thresholds:** Rules 2, 3, and 4 require at least 3 attempts at the relevant grade in the window to fire. This prevents noisy signals from 1-2 random climbs.

Secondary nudge (hold type): Same concept as current coach but using 3-session window. Surfaces weakest hold type with actionable suggestion at appropriate grade.

### 3. Message Design Principles

- Always reference specific numbers ("V3s at 45%") so messages feel current
- Always say WHAT to do and WHY — no vague "persist" or "scale up"
- 1-2 short nudges, same colored-dot format as today
- Nudge type strings and dot colors:

| Type | Dot Color | Used By |
|------|-----------|---------|
| `fatigue` | red | Rule 1 |
| `overreach` | yellow | Rule 2 |
| `regression` | yellow | Rule 3 |
| `push` | green | Rule 4 |
| `solid` | blue | Rule 5 |
| `holds` | purple (existing) | Secondary hold type nudge |

### 4. Remove Pinch Hold Type

Remove "pinch" from the hold type system entirely:
- Remove from hold type options in climb logging UI
- Remove from `holdTypeGradeLevels` query and hold type ring component
- Remove from coach hold type nudge logic
- Remaining hold types: jug, crimp, sloper

### 5. Implementation Scope

**Backend (`convex/analytics.ts` — `coachNudges` query):**
- Replace calendar date windows with "last N sessions" grouping (90-day fetch, group by distinct `climbedAt`)
- New send-rate-per-grade calculations over 3-session and 10-session windows
- New rule evaluation in priority order with minimum attempt thresholds
- Hold type nudge updated to 3-session window
- Remove `computeCyclePhase()`, `computeRestDays()`, and all periodization logic
- Remove `isRest` from return type

**Frontend (`coach-card.tsx`):**
- No structural changes — still 1-2 nudges with colored dots
- Remove `cycleAnchor`, `ratioTransitionDate` props
- Remove `onRestStatus` prop
- Map dot colors to new nudge type strings

**Frontend (`log.tsx`):**
- Remove `cycleAnchor` and `ratioTransitionDate` hardcoded date props
- Remove `isRest` state and prop drilling to `ClimbList`

**Frontend (hold type changes):**
- Remove "pinch" from hold type selector/options
- Update hold type ring to exclude pinch
- Update `holdTypeGradeLevels` query to exclude pinch

**Remove entirely:**
- `computeCyclePhase()` function
- `computeRestDays()` function
- Rest phase logic and rest activity suggestions
- `isRest` return field and all downstream consumption (`log.tsx`, `climb-list.tsx`, `session-focus.tsx`)
- `onRestStatus` callback prop
- 10+ attempt count thresholds (zero-send detection replaced by Rule 2 overreach)
- Hardcoded `cycleAnchor="2026-03-05"` and `ratioTransitionDate="2026-03-27"` in `log.tsx`
- `getStartOfWeek()` usage within `coachNudges` (still used by `weeklyZones`, leave that intact)
- Dead code: `send-rate.tsx` component if it references removed queries

**No changes to:**
- Schema (no new fields)
- Climb logging flow (except removing pinch option)
- Pyramid, journey timeline components
- Weekly zones component (works independently)
