# Session Focus Bar Chart

## Summary

Replace the climb list with a bar chart showing today's climbing progress against remaining pyramid gaps, grouped by training zone and tailored to the session type.

## Design

### Layout

Stacked labels above horizontal bars:

```
Volume Day

Build (V2-V3)
████████████░░░░░░  8/14

Project (V4)
███                 2/3

Goal (V5)
                    0/1
```

- Solid fill = today's sends at that zone
- Bar max width = remaining pyramid target
- Count shows `today / remaining`

### Session Types

Based on day of week:
- Monday = Volume day → build zone bar highlighted, others faded
- Wednesday = Project day → project/goal bars highlighted, build faded
- Other training days = no emphasis, all bars equal

### Data

Reuse existing `api.analytics.pyramid` query which returns sends per grade and targets. Group grades into build/project/goal zones client-side based on `goalGrade`.

- Build zone = goalGrade - 3 to goalGrade - 2
- Project zone = goalGrade - 1
- Goal zone = goalGrade

### Files

- `src/components/log/session-focus.tsx` — new component
- `src/routes/log.tsx` — swap ClimbList for SessionFocus
