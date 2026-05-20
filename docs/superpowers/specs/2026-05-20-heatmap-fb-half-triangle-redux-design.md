# Heatmap FB Half-Triangle Redux + LadderSimple Icon — Design

**Date:** 2026-05-20
**Status:** Approved for planning

## Summary

Restore the half-triangle treatment for fingerboard days (rest+FB and climb+FB) after user testing. Strength keeps the full-block treatment from the prior change. Introduce a `LadderSimple` icon for fingerboard wherever "FB" text or a generic Moon icon was used as the FB indicator.

## Motivation

The user lived with the all-full-block treatment from `90096be`/`fc933e9`/`641833c` and concluded fingerboard reads better as a half-triangle — the empty top-left signals "rested from climbing" and the slate gray bottom-right keeps the visual quiet. Strength, by contrast, deserves the full-block emphasis (yellow). On climb days, the diagonal split (grade / slate) better preserves the climb's headline status while still showing that fingerboard happened.

The "FB" text label on the Log page action button has felt out of place against the icon-based siblings (Plus/Check/Barbell). A `LadderSimple` glyph — vertical rungs evoking hangboard edges — replaces it.

## Rendering Matrix

| Day state | Visual treatment | Icon | Color |
|---|---|---|---|
| Rest | empty cell | Moon, centered | — |
| Fingerboard only | half-triangle: empty top-left, slate gray bottom-right | LadderSimple, top-left of empty half | `TRAINING_FILL` slate gray |
| Strength only | full block | Barbell, centered | `STRENGTH_FILL` yellow |
| Fingerboard + strength | half-triangle: yellow top-left, slate gray bottom-right | none — both halves colored | `STRENGTH_FILL` + `TRAINING_FILL` |
| Climb only | solid block | — | grade color |
| Climb + fingerboard | diagonal split: grade top-left, slate gray bottom-right | none | grade + `TRAINING_FILL` |
| Climb + strength | diagonal split: grade top-left, yellow bottom-right | none | grade + `STRENGTH_FILL` |
| Climb + fingerboard + strength | diagonal split: grade top-left, slate gray bottom-right (FB wins on training half) | none | grade + `TRAINING_FILL` |
| Goal date | checkered overlay | — | overrides |
| Competition date | gold tint | Trophy, centered | overrides |

**Icon rule**: Icon shows when the cell has an *empty half* (FB-only) or is a *full block* (strength-only or rest). When both halves are colored, color carries the meaning and no icon renders.

**Color-priority rule** (when both training types are present): on the training half of a diagonal-split cell, `TRAINING_FILL` (slate gray, fingerboard) wins over `STRENGTH_FILL` (yellow, strength). Rationale: climb days are predominantly about the climb; the training-half color is a secondary signal, and fingerboard is the more common training pattern.

## Implementation

Three areas of change, all in the frontend:

### Heatmap components

`src/components/analytics/year-calendar.tsx` and `src/components/analytics/recent-months.tsx`.

The training branch becomes a three-way conditional:

```ts
} else if (hasTraining) {
  if (hasFingerboard && !hasStrength) {
    // FB only — half-triangle, slate gray, LadderSimple icon
    splitGradient = `linear-gradient(135deg, ${EMPTY_COLOR} 0 50%, ${TRAINING_FILL} 50% 100%)`;
    bg = "transparent";
    if (!isToday) border = "1px solid rgba(74,74,82,0.25)";
  } else if (hasStrength && !hasFingerboard) {
    // Strength only — full yellow block, Barbell centered
    bg = STRENGTH_FILL;
    if (!isToday) border = "1px solid rgba(245,158,11,0.5)";
  } else {
    // FB + strength — half-triangle: yellow top-left, slate bottom-right, no icon
    splitGradient = `linear-gradient(135deg, ${STRENGTH_FILL} 0 50%, ${TRAINING_FILL} 50% 100%)`;
    bg = "transparent";
    if (!isToday) border = "1px solid rgba(74,74,82,0.25)";
  }
}
```

The climb branch gains a similar mini-conditional:

```ts
} else if (hasClimb) {
  const grade = GRADES[count - 1];
  if (grade) {
    if (hasFingerboard) {
      // Climb + FB (with or without strength) — grade / slate diagonal
      splitGradient = `linear-gradient(135deg, ${colorMap[grade]} 0 50%, ${TRAINING_FILL} 50% 100%)`;
      bg = "transparent";
    } else if (hasStrength) {
      // Climb + strength only — grade / yellow diagonal
      splitGradient = `linear-gradient(135deg, ${colorMap[grade]} 0 50%, ${STRENGTH_FILL} 50% 100%)`;
      bg = "transparent";
    } else {
      // Climb only — solid grade
      bg = colorMap[grade];
    }
    if (!isToday) border = "1px solid rgba(128,128,128,0.15)";
  }
}
```

Icon block: replace the conditional that previously rendered a centered Moon (training-only) or centered Barbell with one that handles the matrix:

```tsx
{hasStrength && !hasFingerboard && !hasClimb && !isFuture /* && !isCompDate */ && (
  <Barbell size={6} weight="fill" className="opacity-50" />
)}
{hasFingerboard && !hasStrength && !hasClimb && !isFuture /* && !isCompDate */ && (
  <LadderSimple size={5} weight="fill" className="absolute opacity-50" style={{ top: 0, left: 0 }} />
)}
```

(The exact icon sizes and offsets are calibrated per file — year-calendar uses smaller sizes than recent-months. The pre-existing pattern from earlier commits stands.)

Imports gain `LadderSimple` from `@phosphor-icons/react`. `Barbell` import stays. `Moon` stays (rest-day Moon is unchanged).

### Log page action button

`src/components/log/action-buttons.tsx`. The FB button currently shows "FB" as `font-display font-bold text-2xl` text. Replace with `<LadderSimple size={32} weight="bold" />`. The button keeps `#4a4a52` background and click handler.

### Log page chip list

`src/components/log/climb-list.tsx`. The `FingerboardChip` currently renders the literal string `"FB ×{n}"`. Replace with `<LadderSimple size={14} weight="bold" className="text-white" />` followed by `×{n}` — matching the `StrengthChip` layout exactly.

The Phosphor import gains `LadderSimple`.

### `splitGradient` plumbing returns

This work re-introduces `splitGradient` assignments in both heatmap files. The variable's declaration already exists in `year-calendar.tsx` (it survived the cleanup deferral); add it to `recent-months.tsx` if needed. The comp-date `if (splitGradient)` guard in `year-calendar.tsx` becomes load-bearing again.

## Out of Scope

- Changing `STRENGTH_FILL` yellow or `TRAINING_FILL` slate gray values.
- Replacing the Moon icon on rest days.
- Replacing the Barbell icon on strength-only days.
- Backend changes — `trainingByDate` already returns `hasFingerboard` / `hasStrength`.
- Mobile/responsive tuning.
- New animations.

## Migration / Deploy

No backend or schema changes. No Convex deploy needed. Frontend-only.
