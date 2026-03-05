# Coach Card Design

Replaces the send rate card with 1-2 contextual training nudges focused on training balance and hold type gaps.

## Backend: `coachNudges` query

Accepts `{ goalGrade }`. Evaluates rules in priority order, returns top 2.

### Rules (priority order)

1. **Low project volume** — < 2 project-grade attempts in 14 days → "Get more V4 attempts in — only {n} in 2 weeks"
2. **Too much warm-up** — Warm-up > 60% of this week's total → "Heavy on warm-ups — try more {build base grades}"
3. **Neglected hold type** — One hold type < 20% of last 30 days → "Try a {grade} {hold} today"
4. **Low build base send rate** — Build base send rate < 50% in 30 days → "Focus on sending {grades} — only {n}% send rate"
5. **Positive fallback** — Nothing fires → "Good balance this week" + hold focus

Each nudge: `{ message: string, type: "balance" | "holds" | "positive" }`

## Frontend: `coach-card.tsx`

- Same card shell as other cards
- 1-2 nudge lines with colored dot indicator (balance=tertiary, holds=secondary, positive=accent)
- Compact `text-sm` for half-width column

## Files

1. `convex/analytics.ts` — Add `coachNudges` query
2. `src/components/analytics/coach-card.tsx` — New component
3. `src/routes/analytics.tsx` — Swap SendRate → CoachCard
