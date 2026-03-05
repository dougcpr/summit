# Summit — Design Document

**Date:** 2026-03-04
**Status:** Approved

## Overview

Summit is a rebuild of the Patchwork bouldering training app. It replaces Supabase with Convex, reorganizes the codebase, and adds authentication. The app tracks daily climbing sessions (grades, hold types, sends vs attempts) and provides analytics to guide training.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | React 19 SPA, TypeScript |
| Build | Rsbuild, pnpm |
| Routing | TanStack Router (file-based) |
| Backend | Convex (database, server functions, real-time, cron) |
| Auth | Clerk |
| Styling | Tailwind CSS v4 + CSS variables |
| Charts | Recharts |
| Animations | Framer Motion |
| Icons | Phosphor Icons |
| Lint/Format | oxlint, oxfmt |

## Architecture

**Approach: Thin Client, Heavy Convex**

All business logic and analytics computations live in Convex server functions. The React client is purely a rendering layer. Convex's reactive queries auto-update the UI when underlying data changes — no React Query or manual cache invalidation needed.

## Project Structure

```
summit/
├── convex/
│   ├── schema.ts              # Database schema
│   ├── climbs.ts              # Climb queries & mutations
│   ├── notes.ts               # Note queries & mutations
│   ├── analytics.ts           # Server-computed analytics
│   └── crons.ts               # Scheduled functions
├── src/
│   ├── main.tsx               # Entry point
│   ├── app.tsx                # App shell (Convex + Clerk providers)
│   ├── routes/
│   │   ├── __root.tsx         # Root layout (bottom tab bar)
│   │   ├── log.tsx            # Daily notes & logging page
│   │   └── analytics.tsx      # Analytics & progress page
│   ├── components/
│   │   ├── layout/
│   │   │   └── tab-bar.tsx
│   │   ├── log/
│   │   │   ├── note-editor.tsx
│   │   │   ├── grade-selector.tsx
│   │   │   ├── hold-type-picker.tsx
│   │   │   ├── action-buttons.tsx
│   │   │   ├── today-summary.tsx
│   │   │   └── climb-list.tsx
│   │   └── analytics/
│   │       ├── pyramid.tsx
│   │       ├── activity-heatmap.tsx
│   │       ├── hold-type-ring.tsx
│   │       ├── weekly-zones.tsx
│   │       └── send-rate.tsx
│   ├── lib/
│   │   ├── grades.ts          # Grade constants, colors, ordering
│   │   └── dates.ts           # Date utility helpers
│   └── styles/
│       └── globals.css        # Tailwind imports + CSS variable theme
├── public/
├── package.json
├── rsbuild.config.ts
├── tsconfig.json
└── tailwind.config.ts
```

## Data Model

### Climbs Table

```typescript
climbs: defineTable({
  userId: v.string(),         // Clerk user ID
  grade: v.string(),          // "V0" through "V10"
  completed: v.boolean(),     // sent vs attempted
  holdType: v.string(),       // "jug" | "crimp" | "sloper"
  climbedAt: v.number(),      // timestamp (normalized to noon UTC)
})
  .index("by_user", ["userId"])
  .index("by_user_date", ["userId", "climbedAt"])
```

### Notes Table

```typescript
notes: defineTable({
  userId: v.string(),
  content: v.string(),
  date: v.string(),           // "YYYY-MM-DD" (simpler than timestamp)
})
  .index("by_user_date", ["userId", "date"])
```

**Key decisions:**
- Notes use `date` as `"YYYY-MM-DD"` string for simple day lookups
- Climbs use `climbedAt` timestamp for range queries in analytics
- Both indexed by userId for auth-scoped access
- Compound `by_user_date` indexes for efficient per-day queries

## Convex Server Functions

### CRUD

| Function | Type | Purpose |
|----------|------|---------|
| `climbs.add` | mutation | Insert a climb |
| `climbs.remove` | mutation | Delete a climb by ID |
| `climbs.getByDate` | query | Get climbs for a specific day |
| `climbs.getAll` | query | Get all climbs for a user |
| `notes.upsert` | mutation | Insert or update daily note |
| `notes.getByDate` | query | Get note for a specific day |

### Analytics (server-computed, reactive)

| Function | Type | Purpose |
|----------|------|---------|
| `analytics.pyramid` | query | Pyramid data for goal grade |
| `analytics.heatmapData` | query | Daily activity aggregation for heatmap |
| `analytics.holdTypeBreakdown` | query | Jug/Crimp/Sloper distribution (30 days) |
| `analytics.weeklyZones` | query | Training zone progress with targets |
| `analytics.sendRates` | query | Send rate % by zone (30 days) |

All queries are reactive — they auto-update when underlying data changes.

## UI Design

### Navigation

- Bottom tab bar: "Log" (pencil icon) and "Analytics" (chart icon)
- Active tab highlighted with primary color
- Fixed at bottom on mobile
- On desktop (>768px), converts to minimal left sidebar

### Page 1: Daily Log (`/log`)

- **Date picker**: Left/right arrows to navigate days, tap date for calendar
- **Notes textarea**: Auto-saves via debounced Convex mutation (1s delay)
- **Grade selector**: V0-V10 with up/down arrows
- **Hold type picker**: Jug / Crimp / Sloper buttons
- **Action buttons**: "+ Attempt" and "Check Send"
- **Today's summary pill**: "X/Y (Z%)" sends/total
- **Climb list**: Scrollable, Framer Motion swipe-to-delete

### Page 2: Analytics (`/analytics`)

- **Goal pyramid**: Selectable goal grade, progress ring countdown, pyramid bars
- **Activity heatmap**: Calendar view with color-coded intensity (Recharts)
- **Hold type focus ring**: Donut chart showing distribution, center shows underrepresented type
- **Weekly training zones**: 4 zones with progress bars and targets
- **Send rate comparison**: Actual vs expected rates, color-coded pass/fail

### Responsive Layout

- Mobile (<768px): Single column, stacked cards
- Tablet/Desktop (>=768px): 2-column grid for analytics cards, sidebar navigation

### Design System

- **Colors**: Mustard (#e4c44d), Burnt Orange (#d96c4f), Olive (#6a994e), Teal (#5995a3)
- **Background**: Warm Cream (#f6f1e3), Card (#faf7f0)
- **Font**: VT323 (retro monospace)
- **Borders**: Deep Charcoal (#3b3b3b)
- **Danger**: Rusty Crimson (#c44545)

## Auth Flow

- Clerk handles login/signup UI (pre-built components)
- `ConvexProviderWithClerk` passes JWT to Convex
- All server functions receive authenticated `userId`
- Unauthenticated users see Clerk sign-in page

## Error Handling

- Convex mutations throw on failure — caught by React error boundaries
- Convex auto-reconnects on network issues
- Optimistic updates for climb logging (show immediately, revert on failure)
- Notes: "saving..." / "saved" indicator

## Manual Setup Steps

1. `npx convex dev` — creates Convex project, prompts for setup
2. Create Clerk application, get API keys
3. Configure Clerk as Convex auth provider in Convex dashboard
4. Migrate data from Supabase: export climbs/notes, import via Convex mutations

## Testing

- Convex functions: Convex built-in test framework
- UI components: Vitest + React Testing Library
- E2E: Playwright (future)

## Deployment

- Vercel: React SPA static build
- Convex Cloud: backend (separate from Vercel)
- Clerk: auth dashboard configuration
