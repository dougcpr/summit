# Journey Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the Analytics page into two focused pages — Analytics (Pyramid + Hold Levels) and Journey (timeline + year calendar) — and add a new nav tab.

**Architecture:** Extract `GOAL_GRADE` to shared config, create a new `/journey` route with existing timeline components plus a new `YearCalendar` component, slim down Analytics to just Pyramid and HoldTypeTimeline, and add a 4th nav tab with Compass icon.

**Tech Stack:** React, TanStack Router (file-based), Convex (queries/mutations), Tailwind CSS, Phosphor Icons

**Spec:** `docs/superpowers/specs/2026-03-24-journey-page-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/lib/grades.ts` | Add exported `GOAL_GRADE` constant |
| Create | `src/components/analytics/year-calendar.tsx` | 3x4 year calendar with day-level grade coloring |
| Create | `src/routes/journey.tsx` | Journey page route (timeline + calendar) |
| Modify | `src/routes/analytics.tsx` | Remove journey/activity sections, import shared GOAL_GRADE |
| Modify | `src/routes/__root.tsx` | Add Journey nav tab between Log and Analytics |

---

### Task 1: Extract GOAL_GRADE to shared config

**Files:**
- Modify: `src/lib/grades.ts` (add constant at end of file)
- Modify: `src/routes/analytics.tsx:15` (replace local constant with import)

- [ ] **Step 1: Add GOAL_GRADE to grades.ts**

Add at the end of `src/lib/grades.ts`:

```typescript
export const GOAL_GRADE = "V5";
```

- [ ] **Step 2: Update analytics.tsx import**

In `src/routes/analytics.tsx`, add `GOAL_GRADE` to the existing grades import:

```typescript
import { GOAL_GRADE } from "../lib/grades";
```

Remove the local `const GOAL_GRADE = "V5";` line (line 15).

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/grades.ts src/routes/analytics.tsx
git commit -m "refactor: extract GOAL_GRADE to shared grades config"
```

---

### Task 2: Create YearCalendar component

**Files:**
- Create: `src/components/analytics/year-calendar.tsx`

This component takes heatmap data and renders a 3x4 grid of months with per-day grade coloring and year navigation arrows.

- [ ] **Step 1: Create the component file**

Create `src/components/analytics/year-calendar.tsx` with the following content:

```tsx
import { useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { GRADES, colorMap } from "../../lib/grades";

const EMPTY_COLOR = "#f6f1e3";
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

interface HeatmapEntry {
  date: string;   // "YYYY-MM-DD"
  count: number;  // 1-based weighted average grade index
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function YearCalendar({ data }: { data: HeatmapEntry[] }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const todayStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Determine earliest year from data
  const years = data.map((d) => parseInt(d.date.substring(0, 4), 10));
  const earliestYear = years.length > 0 ? Math.min(...years) : currentYear;

  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Build lookup map for selected year
  const dayMap = new Map<string, number>();
  for (const entry of data) {
    if (entry.date.startsWith(String(selectedYear))) {
      dayMap.set(entry.date, entry.count);
    }
  }

  const canGoBack = selectedYear > earliestYear;
  const canGoForward = selectedYear < currentYear;

  return (
    <div>
      {/* Year navigation */}
      <div className="flex items-center justify-center gap-3 mb-2">
        <button
          onClick={() => canGoBack && setSelectedYear((y) => y - 1)}
          className={`p-1 ${canGoBack ? "opacity-50 hover:opacity-100" : "opacity-15 cursor-default"}`}
          disabled={!canGoBack}
        >
          <CaretLeft size={14} weight="bold" />
        </button>
        <span className="text-xs font-display tracking-widest opacity-70">
          {selectedYear}
        </span>
        <button
          onClick={() => canGoForward && setSelectedYear((y) => y + 1)}
          className={`p-1 ${canGoForward ? "opacity-50 hover:opacity-100" : "opacity-15 cursor-default"}`}
          disabled={!canGoForward}
        >
          <CaretRight size={14} weight="bold" />
        </button>
      </div>

      {/* 3x4 month grid */}
      <div className="grid grid-cols-3 gap-2">
        {MONTH_NAMES.map((monthName, monthIdx) => {
          const daysInMonth = getDaysInMonth(selectedYear, monthIdx);
          const firstDay = getFirstDayOfMonth(selectedYear, monthIdx);

          return (
            <div key={monthName} className="px-1">
              <div className="text-[7px] uppercase tracking-wider opacity-40 text-center mb-0.5">
                {monthName}
              </div>
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 gap-px mb-px">
                {DAY_HEADERS.map((d, i) => (
                  <div key={i} className="text-[5px] text-center opacity-25">
                    {d}
                  </div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-px">
                {/* Blank offset cells */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`blank-${i}`} className="aspect-square" />
                ))}
                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
                  const day = dayIdx + 1;
                  const dateStr = `${selectedYear}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const count = dayMap.get(dateStr);
                  const isFuture = dateStr > todayStr;

                  let bg = EMPTY_COLOR;
                  let border = "none";

                  if (isFuture) {
                    bg = "rgba(59,59,59,0.04)";
                  } else if (count !== undefined && count > 0) {
                    const grade = GRADES[count - 1];
                    if (grade) {
                      bg = colorMap[grade];
                      border = "1px solid rgba(59,59,59,0.1)";
                    }
                  }

                  return (
                    <div
                      key={day}
                      className="aspect-square rounded-[2px]"
                      style={{ backgroundColor: bg, border }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds (component created but not yet imported anywhere).

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/year-calendar.tsx
git commit -m "feat: add YearCalendar component with 3x4 month grid and year navigation"
```

---

### Task 3: Create Journey page route

**Files:**
- Create: `src/routes/journey.tsx`

- [ ] **Step 1: Create the route file**

Create `src/routes/journey.tsx`:

```tsx
import { useQuery, useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { GOAL_GRADE } from "../lib/grades";
import { JourneyTimeline } from "../components/analytics/journey-timeline";
import { HoldTypeTimeline } from "../components/analytics/hold-type-timeline";
import { YearCalendar } from "../components/analytics/year-calendar";

export const Route = createFileRoute("/journey")({
  component: JourneyPage,
});

function JourneyPage() {
  const ensureCache = useMutation(api.analyticsCache.ensureCache);
  useEffect(() => { ensureCache({ goalGrade: GOAL_GRADE }); }, [GOAL_GRADE]);

  const heatmap = useQuery(api.analytics.heatmapData);
  const isEmpty = heatmap && heatmap.length < 10;

  if (heatmap && isEmpty) {
    return (
      <div
        className="p-4 font-display max-w-lg mx-auto flex items-center justify-center"
        style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}
      >
        <p className="text-center opacity-50">
          Log some more climbs to see your journey!
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-4 pb-2 font-display max-w-lg mx-auto flex flex-col justify-evenly overflow-hidden"
      style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}
    >
      {/* How I Got Here */}
      <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">
        How I Got Here
      </div>
      <JourneyTimeline goalGrade={GOAL_GRADE} />
      <div className="mt-1" />
      <HoldTypeTimeline goalGrade={GOAL_GRADE} />

      <hr className="border-border/30 my-1.5" />

      {/* Year at a Glance */}
      <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">
        Year at a Glance
      </div>
      {heatmap && <YearCalendar data={heatmap} />}
    </div>
  );
}
```

- [ ] **Step 2: Regenerate route tree**

Run: `pnpm dev` briefly or check if `routeTree.gen.ts` updates automatically. If not:

Run: `pnpm build`

The TanStack Router plugin will auto-generate the updated `routeTree.gen.ts` with the `/journey` route.

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds with the new route registered.

- [ ] **Step 4: Commit**

```bash
git add src/routes/journey.tsx src/routeTree.gen.ts
git commit -m "feat: add Journey page with timeline and year calendar"
```

---

### Task 4: Slim down Analytics page

**Files:**
- Modify: `src/routes/analytics.tsx`

Remove How I Got Here and Activity sections. Keep Focus, Pyramid, and HoldTypeTimeline (as "Hold Levels").

- [ ] **Step 1: Update analytics.tsx**

Replace the entire content of `src/routes/analytics.tsx` with:

```tsx
import { useQuery, useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { GOAL_GRADE } from "../lib/grades";
import { Pyramid } from "../components/analytics/pyramid";
import { HoldTypeTimeline } from "../components/analytics/hold-type-timeline";
import { Focus } from "../components/analytics/focus";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const ensureCache = useMutation(api.analyticsCache.ensureCache);
  useEffect(() => { ensureCache({ goalGrade: GOAL_GRADE }); }, [GOAL_GRADE]);

  const heatmap = useQuery(api.analytics.heatmapData);
  const isEmpty = heatmap && heatmap.length < 10;

  if (heatmap && isEmpty) {
    return (
      <div
        className="p-4 font-display max-w-lg mx-auto flex items-center justify-center"
        style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}
      >
        <p className="text-center opacity-50">
          Log some more climbs to see your analytics!
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-4 pb-2 font-display max-w-lg mx-auto flex flex-col justify-evenly overflow-hidden"
      style={{ height: "calc(100dvh - 4rem - env(safe-area-inset-bottom))" }}
    >
      {/* Focus */}
      <Focus goalGrade={GOAL_GRADE} />

      {/* Where I Am */}
      <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">
        Where I Am
      </div>
      <Pyramid goalGrade={GOAL_GRADE} />

      <hr className="border-border/30 my-1.5" />

      {/* Hold Levels */}
      <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">
        Hold Levels
      </div>
      <HoldTypeTimeline goalGrade={GOAL_GRADE} />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds. No unused import warnings for JourneyTimeline or ActivityHeatmap.

- [ ] **Step 3: Commit**

```bash
git add src/routes/analytics.tsx
git commit -m "refactor: slim Analytics to Pyramid and Hold Levels only"
```

---

### Task 5: Add Journey tab to navigation

**Files:**
- Modify: `src/routes/__root.tsx`

Add Journey link (Compass icon) between Log and Analytics in both desktop sidebar and mobile bottom tab bar.

- [ ] **Step 1: Update __root.tsx**

Add `Compass` to the Phosphor import:

```typescript
import { PencilSimple, Compass, ChartBar, SignOut } from "@phosphor-icons/react";
```

In the **desktop sidebar** (`<nav className="hidden md:flex ...>`), add a Journey link between the Log link and the Analytics link:

```tsx
<Link
  to="/journey"
  className="flex flex-col items-center p-2 rounded-lg text-sm"
  activeProps={{ className: "text-primary bg-primary/10" }}
  inactiveProps={{ className: "text-border/50 hover:text-border" }}
>
  <Compass size={24} weight="bold" />
</Link>
```

In the **mobile bottom tab bar** (`<nav className="md:hidden ...>`), add a Journey link between Log and Analytics:

```tsx
<Link
  to="/journey"
  className="flex-1 flex flex-col items-center py-2 text-sm"
  activeProps={{ className: "text-primary" }}
  inactiveProps={{ className: "text-border/50" }}
>
  <Compass size={24} weight="bold" />
  <span>Journey</span>
</Link>
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: No errors.

- [ ] **Step 4: Manual verification**

Run: `pnpm dev`

Verify in browser:
1. Bottom nav shows 4 tabs: Log, Journey, Analytics, Logout
2. Clicking Journey navigates to `/journey` and shows the timeline + calendar
3. Clicking Analytics navigates to `/analytics` and shows only Pyramid + Hold Levels
4. Year calendar renders 3x4 grid with colored day cells
5. Year navigation arrows work (< and > cycle years, > disabled on current year)
6. Active tab highlighting works correctly for both Journey and Analytics

- [ ] **Step 5: Commit**

```bash
git add src/routes/__root.tsx
git commit -m "feat: add Journey tab to navigation with Compass icon"
```
