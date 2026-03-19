# Log Page Consistent Design

## Problem

The log page uses white card backgrounds (`bg-card-bg` / `bg-white`) on every element, while the analytics page now uses a borderless design with the cream page background (`#f6f1e3`) flowing through. The two pages feel visually disconnected.

## Goal

Remove white backgrounds from the log page so the cream background flows through, matching the analytics page. Keep `border-2` borders on interactive elements so they remain clearly tappable.

## Changes by Component

### Coach Card (`src/components/analytics/coach-card.tsx`)

- Remove `border-2 border-border rounded-lg` card wrapper
- Remove `bg-card-bg` background
- Keep content and colored dots as-is
- Result: borderless, like the analytics "What's Next" observations

### Note Editor (`src/components/log/note-editor.tsx`)

- Remove `bg-card-bg` background → transparent
- Soften border from `border-2` to `border` (1px)
- Keep `border-border rounded-lg` and focus state
- Result: subtle input field on cream background

### Grade Selector (`src/components/log/grade-selector.tsx`)

- Remove `bg-white` background → transparent
- Keep `border-2 border-border rounded-lg` on all elements (main container, up/down buttons)
- Result: same interactive feel, no white fill

### Hold Type Picker (`src/components/log/hold-type-picker.tsx`)

- Unselected buttons: remove any white/card background → transparent
- Selected button: keep its color fill (e.g., jug's gold `bgColor`)
- Keep `border-2 border-border` on all buttons
- Result: only the active hold type has a colored fill

### Action Buttons (`src/components/log/action-buttons.tsx`)

- No changes needed — already use color fills (coral for attempt, green for send)

### Today Summary (`src/components/log/today-summary.tsx`)

- Remove `bg-white` background → transparent
- Keep `border-2 border-border rounded-lg`

### Climb List (`src/components/log/climb-list.tsx`)

- Remove `bg-card-bg` background from the list container → transparent
- Remove any white background from individual climb list items → transparent
- Keep `border-2 border-border rounded-lg` on container and items

## Out of Scope

- Layout changes, reordering, or adding/removing components
- Changes to the analytics page
- Changes to the date navigator at the bottom
- Changes to the navigation bar
