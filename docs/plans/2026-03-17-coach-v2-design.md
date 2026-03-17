# Coach V2: Mirror + Nudge Design

## Philosophy

Shift from grade-chasing periodization to fundamentals-first, session-reactive coaching. The goal is "look seamless at your grade" — the coach observes recent performance and gives fast, actionable feedback that reinforces movement quality over grade progression.

## Core Changes

### 1. Data Windows — Session-Based Reactivity

Replace current 30-day and 14-day calendar windows with session-based analysis:

- **Short window (last 3 sessions):** Primary coaching input. Send rate per grade, attempt counts, hold type breakdown.
- **Medium window (last 10 sessions):** Trend detection. Enables regression alerts by comparing current performance to recent baseline.
- **Remove periodization entirely:** No training weeks, rest phases, cycle anchors, or ratio transition dates. The coach reacts to what it sees, session by session.

A "session" is defined as a distinct `climbedAt` date with at least one logged climb.

### 2. Coaching Rules — Priority-Ordered Nudges

Primary nudge evaluates in order, picks first match:

| Priority | Rule | Trigger | Message Pattern |
|----------|------|---------|-----------------|
| 1 | Fatigue detection | Send rate declining across ALL grades over 3 sessions | "Send rates dropping across the board — consider a rest day or easy session" |
| 2 | Grade overreach | Build grade send rate < 50% over 3 sessions | "V3s at 45% — focus on clean sends there before pushing up" |
| 3 | Regression alert | Grade that was 70%+ over 10 sessions drops below 50% in last 3 | "V3 crimp send rate dropped from 75% to 40% — something's off, revisit those" |
| 4 | Ready to push | Build grade send rate 70%+ over 3 sessions | "V4s looking smooth at 75% — try a V5 when it feels right" |
| 5 | Solid fallback | Nothing else triggers | "Base looks solid — keep building volume at V3/V4" |

Secondary nudge (hold type): Same concept as current coach but using 3-session window. Surfaces weakest hold type with actionable suggestion at appropriate grade.

### 3. Message Design Principles

- Always reference specific numbers ("V3s at 45%") so messages feel current
- Always say WHAT to do and WHY — no vague "persist" or "scale up"
- 1-2 short nudges, same colored-dot format as today
- Dot colors: fatigue=red, overreach/regression=yellow, ready to push=green, fallback=blue

### 4. Implementation Scope

**Backend (`convex/analytics.ts` — `coachNudges` query):**
- Replace calendar date windows with "last N sessions" grouping by distinct `climbedAt` dates
- New send-rate-per-grade calculations over 3-session and 10-session windows
- New rule evaluation in priority order
- Hold type nudge updated to 3-session window
- Remove `cycleAnchor`, `ratioTransitionDate`, `computeCyclePhase()`

**Frontend (`coach-card.tsx`):**
- No structural changes — still 1-2 nudges with colored dots
- Remove `cycleAnchor` and `ratioTransitionDate` props
- Map dot colors to new nudge types

**Remove:**
- `computeCyclePhase()` function
- Rest phase logic and rest activity suggestions
- Weekly zone targets from coach logic
- 10+ attempt count thresholds

**No changes to:**
- Schema (no new fields)
- Climb logging flow
- Pyramid, journey timeline, hold type ring components
- Weekly zones component (works independently, coach just stops referencing it)
