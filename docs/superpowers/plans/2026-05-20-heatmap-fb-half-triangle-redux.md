# Heatmap FB Half-Triangle Redux Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the half-triangle treatment for fingerboard cells while keeping strength as a full block; introduce a `LadderSimple` icon as the new fingerboard glyph across the heatmap, the log page action button, and the chip list.

**Architecture:** Frontend-only. The heatmap training and climb branches each become a three-way conditional that depends on which training types are present. A new `LadderSimple` Phosphor import replaces the "FB" string in the action button and the fingerboard chip. Backend unchanged.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Phosphor Icons.

**Verification convention:** No automated test suite. Each code task ends with `pnpm build` + commit. The final task runs `pnpm dev` for a manual browser check against the rendering matrix.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/components/analytics/year-calendar.tsx` | Modify | Three-way training branch (FB-only / strength-only / FB+strength), two-way climb branch (no training / has-training diagonal), icon block update, `LadderSimple` import |
| `src/components/analytics/recent-months.tsx` | Modify | Parallel changes |
| `src/components/log/action-buttons.tsx` | Modify | Replace "FB" text with `LadderSimple` icon, add import |
| `src/components/log/climb-list.tsx` | Modify | Replace "FB ×N" text in `FingerboardChip` with `LadderSimple` icon + ×N, add import |

---

## Task 1: Update `YearCalendar`

**Files:**
- Modify: `/Users/dougcooper/Documents/Code/summit/src/components/analytics/year-calendar.tsx`

- [ ] **Step 1: Add `LadderSimple` to the Phosphor import**

Line 3, change from:

```tsx
import { CaretLeft, CaretRight, Moon, Trophy, Barbell } from "@phosphor-icons/react";
```

to:

```tsx
import { CaretLeft, CaretRight, Moon, Trophy, Barbell, LadderSimple } from "@phosphor-icons/react";
```

- [ ] **Step 2: Replace the climb branch (currently lines 159-166) to add training-aware diagonal splits**

Find:

```tsx
                  } else if (hasClimb) {
                    const grade = GRADES[count - 1];
                    if (grade) {
                      bg = colorMap[grade];
                      if (!isToday) {
                        border = "1px solid rgba(128,128,128,0.15)";
                      }
                    }
                  }
```

Replace with:

```tsx
                  } else if (hasClimb) {
                    const grade = GRADES[count - 1];
                    if (grade) {
                      if (hasFingerboard) {
                        splitGradient = `linear-gradient(135deg, ${colorMap[grade]} 0 50%, ${TRAINING_FILL} 50% 100%)`;
                        bg = "transparent";
                      } else if (hasStrength) {
                        splitGradient = `linear-gradient(135deg, ${colorMap[grade]} 0 50%, ${STRENGTH_FILL} 50% 100%)`;
                        bg = "transparent";
                      } else {
                        bg = colorMap[grade];
                      }
                      if (!isToday) {
                        border = "1px solid rgba(128,128,128,0.15)";
                      }
                    }
                  }
```

The `hasFingerboard` branch wins over `hasStrength` so that climb+FB+strength days still render the grade/slate split (FB color on the training half).

- [ ] **Step 3: Replace the training-only branch (currently lines 167-174) with the three-way conditional**

Find:

```tsx
                  } else if (hasTraining) {
                    const fill = hasFingerboard ? TRAINING_FILL : STRENGTH_FILL;
                    const borderColor = hasFingerboard ? "rgba(74,74,82,0.25)" : "rgba(245,158,11,0.5)";
                    bg = fill;
                    if (!isToday) {
                      border = `1px solid ${borderColor}`;
                    }
                  }
```

Replace with:

```tsx
                  } else if (hasTraining) {
                    if (hasFingerboard && !hasStrength) {
                      splitGradient = `linear-gradient(135deg, ${EMPTY_COLOR} 0 50%, ${TRAINING_FILL} 50% 100%)`;
                      bg = "transparent";
                      if (!isToday) {
                        border = "1px solid rgba(74,74,82,0.25)";
                      }
                    } else if (hasStrength && !hasFingerboard) {
                      bg = STRENGTH_FILL;
                      if (!isToday) {
                        border = "1px solid rgba(245,158,11,0.5)";
                      }
                    } else {
                      // FB + strength — yellow / slate diagonal, no icon
                      splitGradient = `linear-gradient(135deg, ${STRENGTH_FILL} 0 50%, ${TRAINING_FILL} 50% 100%)`;
                      bg = "transparent";
                      if (!isToday) {
                        border = "1px solid rgba(74,74,82,0.25)";
                      }
                    }
                  }
```

- [ ] **Step 4: Replace the training-icon block (currently lines 220-226)**

Find:

```tsx
                      {hasTraining && !hasClimb && !isCompDate && !isFuture && (
                        hasStrength ? (
                          <Barbell size={6} weight="fill" className="opacity-50" />
                        ) : (
                          <Moon size={6} weight="fill" className="opacity-50" />
                        )
                      )}
```

Replace with:

```tsx
                      {hasFingerboard && !hasStrength && !hasClimb && !isCompDate && !isFuture && (
                        <LadderSimple size={5} weight="fill" className="absolute opacity-50" style={{ top: 0, left: 0 }} />
                      )}
                      {hasStrength && !hasFingerboard && !hasClimb && !isCompDate && !isFuture && (
                        <Barbell size={6} weight="fill" className="opacity-50" />
                      )}
```

Two distinct conditionals replace one. Rules:
- `hasFingerboard && !hasStrength` (FB-only) → `LadderSimple` absolute top-left of the empty half (matches the old Moon position).
- `hasStrength && !hasFingerboard` (strength-only) → `Barbell` centered on the full block (unchanged from current behavior).
- `hasFingerboard && hasStrength` (FB+strength) → neither condition fires, no icon (per spec — colors carry it).
- `hasClimb` → neither condition fires, no icon (per spec).

- [ ] **Step 5: Type-check**

Run: `cd /Users/dougcooper/Documents/Code/summit && pnpm build`

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/analytics/year-calendar.tsx
git commit -m "$(cat <<'EOF'
feat(analytics): restore FB half-triangle and add LadderSimple icon

Year-calendar training branch becomes three-way: FB-only renders the
empty/slate half-triangle with LadderSimple top-left; strength-only
stays full yellow block + Barbell; FB+strength splits the diagonal
yellow/slate with no icon. Climb branch adds diagonal splits with
training color when training is present (FB wins on FB+strength+climb).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Update `RecentMonths`

**Files:**
- Modify: `/Users/dougcooper/Documents/Code/summit/src/components/analytics/recent-months.tsx`

- [ ] **Step 1: Add `LadderSimple` to the Phosphor import**

Line 2, change from:

```tsx
import { Moon, Barbell } from "@phosphor-icons/react";
```

to:

```tsx
import { Moon, Barbell, LadderSimple } from "@phosphor-icons/react";
```

- [ ] **Step 2: Replace the climb branch (currently lines 117-124)**

Find:

```tsx
                } else if (hasClimb) {
                  const grade = GRADES[count - 1];
                  if (grade) {
                    bg = colorMap[grade];
                    if (!isToday) {
                      border = "1px solid rgba(128,128,128,0.15)";
                    }
                  }
                }
```

Replace with:

```tsx
                } else if (hasClimb) {
                  const grade = GRADES[count - 1];
                  if (grade) {
                    if (hasFingerboard) {
                      backgroundImage = `linear-gradient(135deg, ${colorMap[grade]} 0 50%, ${TRAINING_FILL} 50% 100%)`;
                      bg = "transparent";
                    } else if (hasStrength) {
                      backgroundImage = `linear-gradient(135deg, ${colorMap[grade]} 0 50%, ${STRENGTH_FILL} 50% 100%)`;
                      bg = "transparent";
                    } else {
                      bg = colorMap[grade];
                    }
                    if (!isToday) {
                      border = "1px solid rgba(128,128,128,0.15)";
                    }
                  }
                }
```

Note: `recent-months.tsx` uses `backgroundImage` directly (no `splitGradient` intermediate) — that's the established pattern in this file.

- [ ] **Step 3: Replace the training-only branch (currently lines 125-132) with the three-way conditional**

Find:

```tsx
                } else if (hasTraining) {
                  const fill = hasFingerboard ? TRAINING_FILL : STRENGTH_FILL;
                  const borderColor = hasFingerboard ? "rgba(74,74,82,0.25)" : "rgba(245,158,11,0.5)";
                  bg = fill;
                  if (!isToday) {
                    border = `1px solid ${borderColor}`;
                  }
                }
```

Replace with:

```tsx
                } else if (hasTraining) {
                  if (hasFingerboard && !hasStrength) {
                    backgroundImage = `linear-gradient(135deg, ${EMPTY_COLOR} 0 50%, ${TRAINING_FILL} 50% 100%)`;
                    bg = "transparent";
                    if (!isToday) {
                      border = "1px solid rgba(74,74,82,0.25)";
                    }
                  } else if (hasStrength && !hasFingerboard) {
                    bg = STRENGTH_FILL;
                    if (!isToday) {
                      border = "1px solid rgba(245,158,11,0.5)";
                    }
                  } else {
                    // FB + strength — yellow / slate diagonal, no icon
                    backgroundImage = `linear-gradient(135deg, ${STRENGTH_FILL} 0 50%, ${TRAINING_FILL} 50% 100%)`;
                    bg = "transparent";
                    if (!isToday) {
                      border = "1px solid rgba(74,74,82,0.25)";
                    }
                  }
                }
```

- [ ] **Step 4: Replace the training-icon block (currently lines 147-153)**

Find:

```tsx
                    {hasTraining && !hasClimb && !isFuture && (
                      hasStrength ? (
                        <Barbell size={8} weight="fill" className="opacity-50" />
                      ) : (
                        <Moon size={8} weight="fill" className="opacity-50" />
                      )
                    )}
```

Replace with:

```tsx
                    {hasFingerboard && !hasStrength && !hasClimb && !isFuture && (
                      <LadderSimple size={6} weight="fill" className="absolute opacity-50" style={{ top: 1, left: 1 }} />
                    )}
                    {hasStrength && !hasFingerboard && !hasClimb && !isFuture && (
                      <Barbell size={8} weight="fill" className="opacity-50" />
                    )}
```

Same rules as year-calendar but `LadderSimple` is `size={6}` at `top: 1, left: 1` (matching the earlier Moon convention in this file), and `Barbell` stays `size={8}` centered.

- [ ] **Step 5: Type-check**

Run: `cd /Users/dougcooper/Documents/Code/summit && pnpm build`

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/analytics/recent-months.tsx
git commit -m "$(cat <<'EOF'
feat(analytics): restore FB half-triangle on recent-months heatmap

Mirror the year-calendar change: FB-only half-triangle with
LadderSimple top-left, strength-only full block + Barbell, FB+strength
diagonal split, climb+training diagonal splits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Replace "FB" text on the Log page

**Files:**
- Modify: `/Users/dougcooper/Documents/Code/summit/src/components/log/action-buttons.tsx`
- Modify: `/Users/dougcooper/Documents/Code/summit/src/components/log/climb-list.tsx`

- [ ] **Step 1: `action-buttons.tsx` — add `LadderSimple` to the import**

Line 1, change from:

```tsx
import { Plus, Check, Barbell } from "@phosphor-icons/react";
```

to:

```tsx
import { Plus, Check, Barbell, LadderSimple } from "@phosphor-icons/react";
```

- [ ] **Step 2: `action-buttons.tsx` — replace the FB button content (currently lines 29-36)**

Find:

```tsx
      <button
        onClick={onFingerboard}
        disabled={disabled}
        className="flex-1 flex items-center justify-center py-4 text-white rounded-lg active:brightness-90 disabled:opacity-30 disabled:active:brightness-100 font-display font-bold text-2xl"
        style={{ backgroundColor: "#4a4a52" }}
      >
        FB
      </button>
```

Replace with:

```tsx
      <button
        onClick={onFingerboard}
        disabled={disabled}
        className="flex-1 flex items-center justify-center py-4 text-white rounded-lg active:brightness-90 disabled:opacity-30 disabled:active:brightness-100"
        style={{ backgroundColor: "#4a4a52" }}
      >
        <LadderSimple size={32} weight="bold" />
      </button>
```

Changes: drop the `font-display font-bold text-2xl` classes (no longer needed without text content); replace `FB` string with `<LadderSimple size={32} weight="bold" />` matching the Barbell button.

- [ ] **Step 3: `climb-list.tsx` — add `LadderSimple` to the import**

Line 3, change from:

```tsx
import { HandGrabbing, Hand, HandPalm, Barbell } from "@phosphor-icons/react";
```

to:

```tsx
import { HandGrabbing, Hand, HandPalm, Barbell, LadderSimple } from "@phosphor-icons/react";
```

- [ ] **Step 4: `climb-list.tsx` — replace `FingerboardChip` JSX (currently lines 51-60)**

Find:

```tsx
  return (
    <button
      onClick={handleDelete}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full shrink-0 active:brightness-90"
      style={{ backgroundColor: "#4a4a52" }}
    >
      <span className="text-sm font-display text-white font-bold">
        FB ×{sessions.length}
      </span>
    </button>
  );
```

Replace with:

```tsx
  return (
    <button
      onClick={handleDelete}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full shrink-0 active:brightness-90"
      style={{ backgroundColor: "#4a4a52" }}
    >
      <LadderSimple size={14} weight="bold" className="text-white" />
      <span className="text-sm font-display text-white font-bold">
        ×{sessions.length}
      </span>
    </button>
  );
```

Now byte-for-byte symmetrical with `StrengthChip` (line 64-83) except the icon component.

- [ ] **Step 5: Type-check**

Run: `cd /Users/dougcooper/Documents/Code/summit && pnpm build`

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/log/action-buttons.tsx src/components/log/climb-list.tsx
git commit -m "$(cat <<'EOF'
feat(log): replace FB text with LadderSimple icon

Action button no longer renders the text 'FB'; it shows a
LadderSimple glyph matching the Barbell button. The fingerboard chip
in the chip list mirrors the strength chip layout: LadderSimple icon
+ ×N count.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Manual browser verification

- [ ] **Step 1: Start dev server**

Run: `cd /Users/dougcooper/Documents/Code/summit && pnpm dev`

- [ ] **Step 2: Walk the rendering matrix**

Open `/analytics` (RecentMonths) and `/journey` (YearCalendar). Verify each state:

1. **Rest day:** empty cell, Moon centered. Unchanged.
2. **Fingerboard-only day:** half-triangle (empty top-left, slate gray bottom-right), `LadderSimple` icon top-left.
3. **Strength-only day:** full yellow block, `Barbell` centered.
4. **FB + strength day:** half-triangle (yellow top-left, slate gray bottom-right), no icon.
5. **Climb-only day:** solid grade-color block, no icon. Unchanged.
6. **Climb + FB day:** diagonal split (grade top-left, slate gray bottom-right), no icon.
7. **Climb + strength day:** diagonal split (grade top-left, yellow bottom-right), no icon.
8. **Climb + FB + strength day:** diagonal split (grade top-left, slate gray bottom-right — FB wins on training half), no icon.
9. **Goal date:** checkered. Unchanged.
10. **Competition date:** gold tint + Trophy. Unchanged.

- [ ] **Step 3: Check the Log page**

Open `/log`:

1. The action button row's third button (FB) now shows a `LadderSimple` icon instead of "FB" text.
2. Tap it; confirm the chip that appears in the chip list shows a `LadderSimple` icon + `×N` (no "FB" text).
3. The Barbell button and chip are unchanged.

- [ ] **Step 4: Stop the dev server**

If you started `pnpm dev` in this task, stop it (Ctrl-C in its terminal).

No commit step — verification only.

---

## Self-Review

**Spec coverage:**

| Spec section | Implemented in |
|---|---|
| FB-only half-triangle + LadderSimple icon | Task 1 (steps 3, 4), Task 2 (steps 3, 4) |
| Strength-only full yellow block + Barbell | Task 1 (step 3 — middle branch), Task 2 (step 3 — middle branch) |
| FB+strength yellow/slate diagonal, no icon | Task 1 (step 3 — else), Task 2 (step 3 — else) |
| Climb-only solid grade block | Task 1 (step 2 — else), Task 2 (step 2 — else) |
| Climb+FB grade/slate diagonal | Task 1 (step 2 — hasFingerboard), Task 2 (step 2 — hasFingerboard) |
| Climb+strength grade/yellow diagonal | Task 1 (step 2 — hasStrength), Task 2 (step 2 — hasStrength) |
| Climb+FB+strength uses grade/slate | Same as climb+FB — `hasFingerboard` branch fires first |
| LadderSimple on Log action button | Task 3 (steps 1, 2) |
| LadderSimple in FingerboardChip | Task 3 (steps 3, 4) |
| Goal/comp date overrides unchanged | Not touched |
| Rest-day Moon unchanged | Not touched |
| Backend unchanged | No backend task — `trainingByDate` already returns the flags |

**Placeholder scan:** No TBDs. Every step shows the exact code.

**Type consistency:**
- `LadderSimple` is imported in all four files (year-calendar, recent-months, action-buttons, climb-list).
- `TRAINING_FILL` / `STRENGTH_FILL` / `EMPTY_COLOR` constants are unchanged.
- The condition `hasFingerboard && !hasStrength` (FB-only) is used identically in both the rendering and icon blocks of both heatmap files.
- The condition `hasStrength && !hasFingerboard` (strength-only) is the same pattern.
- `splitGradient` (year-calendar) vs `backgroundImage` (recent-months) — both files use their existing convention; the spec deferred unifying them.
