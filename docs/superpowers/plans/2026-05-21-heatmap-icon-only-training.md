# Heatmap Icon-Only Training Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip every training-day color fill from the analytics heatmap and render training as a navy icon centered in an empty cell; climb days collapse to a solid grade block; comp Trophy renders unconditionally on comp dates.

**Architecture:** Frontend-only. Two heatmap files lose their training-fill code paths, their `TRAINING_FILL` / `STRENGTH_FILL` constants, and (year-calendar only) their `splitGradient` plumbing. The icon block expands to handle FB-only, strength-only, and FB+strength variants with a navy color and a "/" separator for the combo case. Climb branch reverts to solid grade.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Phosphor Icons.

**Verification convention:** No automated test suite. Each code task ends with `pnpm build` + commit. The final task runs `pnpm dev` for a manual browser check against the rendering matrix.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/components/analytics/year-calendar.tsx` | Modify | Remove `TRAINING_FILL` / `STRENGTH_FILL`; add `TRAINING_ICON`; collapse climb branch to solid grade; drop training-fill branch; remove `splitGradient` plumbing and the comp-date `if (splitGradient)` guard; rewrite the training-icon block with three variants in navy; add `!isGoalDate` training-icon guard |
| `src/components/analytics/recent-months.tsx` | Modify | Same shape, no comp-date / goal-date code exists here |

---

## Task 1: Update `YearCalendar`

**Files:**
- Modify: `/Users/dougcooper/Documents/Code/summit/src/components/analytics/year-calendar.tsx`

- [ ] **Step 1: Replace the constants block (currently lines 7-9)**

Find:

```tsx
// Uses CSS variable so it responds to dark mode
const EMPTY_COLOR = "var(--color-neutral-bg)";
const TRAINING_FILL = "rgba(74,74,82,0.32)";
const STRENGTH_FILL = "rgba(245,158,11,0.5)";
```

Replace with:

```tsx
// Uses CSS variable so it responds to dark mode
const EMPTY_COLOR = "var(--color-neutral-bg)";
const TRAINING_ICON = "#1e3a8a"; // tailwind blue-900 — navy for training icons
```

`TRAINING_FILL` and `STRENGTH_FILL` were only used by the training-fill code paths, which this task removes.

- [ ] **Step 2: Remove `splitGradient` declaration (currently line 155)**

Find:

```tsx
                  const isRest = !isFuture && !hasClimb && !hasTraining && dateStr >= earliestDate && dateStr <= todayStr;

                  let splitGradient: string | undefined;

                  if (isFuture) {
```

Replace with:

```tsx
                  const isRest = !isFuture && !hasClimb && !hasTraining && dateStr >= earliestDate && dateStr <= todayStr;

                  if (isFuture) {
```

(Just delete the `let splitGradient: string | undefined;` line and its surrounding blank line.)

- [ ] **Step 3: Replace the climb + training branches (currently lines 157-195)**

Find:

```tsx
                  if (isFuture) {
                    bg = "rgba(128,128,128,0.08)";
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

Replace with:

```tsx
                  if (isFuture) {
                    bg = "rgba(128,128,128,0.08)";
                  } else if (hasClimb) {
                    const grade = GRADES[count - 1];
                    if (grade) {
                      bg = colorMap[grade];
                      if (!isToday) {
                        border = "1px solid rgba(128,128,128,0.15)";
                      }
                    }
                  }
                  // Training without a climb produces no fill or border —
                  // the icon block below renders the training indicator.
```

The entire `else if (hasTraining)` branch is gone. The climb branch becomes a single `bg = colorMap[grade]` line; the FB / strength sub-conditionals are removed.

- [ ] **Step 4: Simplify the `backgroundImage` init (currently lines 197-198)**

Find:

```tsx
                  let backgroundImage: string | undefined = splitGradient;
                  let backgroundSize: string | undefined;
```

Replace with:

```tsx
                  let backgroundImage: string | undefined;
                  let backgroundSize: string | undefined;
```

(Drop the `= splitGradient` initializer since `splitGradient` no longer exists.)

- [ ] **Step 5: Remove the dead `if (splitGradient)` guard from the comp-date block (currently lines 214-223)**

Find:

```tsx
                  // Competition date styling
                  if (isCompDate && !isGoalDate) {
                    bg = "rgba(228, 196, 77, 0.25)";
                    if (splitGradient) {
                      backgroundImage = undefined;
                      backgroundSize = undefined;
                    }
                    if (!isToday) {
                      border = "1px solid rgba(202, 164, 43, 0.6)";
                    }
                  }
```

Replace with:

```tsx
                  // Competition date styling
                  if (isCompDate && !isGoalDate) {
                    bg = "rgba(228, 196, 77, 0.25)";
                    if (!isToday) {
                      border = "1px solid rgba(202, 164, 43, 0.6)";
                    }
                  }
```

The `if (splitGradient)` guard is removed — `splitGradient` no longer exists.

- [ ] **Step 6: Replace the training-icon block (currently lines 241-246)**

Find:

```tsx
                      {hasFingerboard && !hasStrength && !hasClimb && !isCompDate && !isFuture && (
                        <LadderSimple size={5} weight="fill" className="absolute opacity-50" style={{ top: 0, left: 0 }} />
                      )}
                      {hasStrength && !hasFingerboard && !hasClimb && !isCompDate && !isFuture && (
                        <Barbell size={6} weight="fill" className="opacity-50" />
                      )}
```

Replace with:

```tsx
                      {hasTraining && !hasClimb && !isCompDate && !isGoalDate && !isFuture && (
                        hasFingerboard && hasStrength ? (
                          <span className="flex items-center gap-px opacity-50" style={{ color: TRAINING_ICON }}>
                            <LadderSimple size={4} weight="fill" />
                            <span className="text-[5px] font-bold leading-none">/</span>
                            <Barbell size={4} weight="fill" />
                          </span>
                        ) : hasFingerboard ? (
                          <LadderSimple size={6} weight="fill" className="opacity-50" style={{ color: TRAINING_ICON }} />
                        ) : (
                          <Barbell size={6} weight="fill" className="opacity-50" style={{ color: TRAINING_ICON }} />
                        )
                      )}
```

Key changes:
- One outer conditional gates the whole block on `hasTraining && !hasClimb && !isCompDate && !isGoalDate && !isFuture`. The `!isGoalDate` guard is **new** (small bug fix bundled in — previously training icons could render on top of the goal-date checkered pattern).
- Inside, a ternary chain handles the three variants:
  - `hasFingerboard && hasStrength` → both icons + "/" separator, `size={4}` each, wrapped in a flex `<span>` for centering.
  - `hasFingerboard` (only) → `LadderSimple size={6}`, centered (no `absolute`).
  - else (`hasStrength` only) → `Barbell size={6}`, centered.
- All variants use `color: TRAINING_ICON` (navy) and `opacity-50`.
- The `LadderSimple` icon no longer uses `absolute` positioning or `top: 0, left: 0` — it centers via the cell's existing `flex items-center justify-center`.

- [ ] **Step 7: Type-check**

Run: `cd /Users/dougcooper/Documents/Code/summit && pnpm build`

Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/components/analytics/year-calendar.tsx
git commit -m "$(cat <<'EOF'
feat(analytics): icon-only training on year calendar

Drop the half-triangle and full-block training fills; training days
now render as a navy icon centered in an empty cell (LadderSimple for
FB, Barbell for strength, both + '/' separator for FB+strength).
Climb days become a solid grade block — no diagonal split when
training is also present. Comp dates always render the gold Trophy
on top, fixing the visibility bug where training fills competed with
the Trophy. Removes the now-dead TRAINING_FILL, STRENGTH_FILL, and
splitGradient plumbing. Adds a !isGoalDate guard so training icons
no longer sit on top of the goal-date checkered pattern.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Update `RecentMonths`

**Files:**
- Modify: `/Users/dougcooper/Documents/Code/summit/src/components/analytics/recent-months.tsx`

- [ ] **Step 1: Replace the constants block (currently lines 5-7)**

Find:

```tsx
const EMPTY_COLOR = "var(--color-neutral-bg)";
const TRAINING_FILL = "rgba(74,74,82,0.32)";
const STRENGTH_FILL = "rgba(245,158,11,0.5)";
```

Replace with:

```tsx
const EMPTY_COLOR = "var(--color-neutral-bg)";
const TRAINING_ICON = "#1e3a8a"; // tailwind blue-900 — navy for training icons
```

- [ ] **Step 2: Replace the climb + training branches (currently lines 115-153)**

Find:

```tsx
                if (isFuture) {
                  bg = "rgba(128,128,128,0.08)";
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

Replace with:

```tsx
                if (isFuture) {
                  bg = "rgba(128,128,128,0.08)";
                } else if (hasClimb) {
                  const grade = GRADES[count - 1];
                  if (grade) {
                    bg = colorMap[grade];
                    if (!isToday) {
                      border = "1px solid rgba(128,128,128,0.15)";
                    }
                  }
                }
                // Training without a climb produces no fill or border —
                // the icon block below renders the training indicator.
```

The entire `else if (hasTraining)` branch is gone, and the climb branch becomes a single `bg = colorMap[grade]` line.

- [ ] **Step 3: Replace the training-icon block (currently lines 167-173)**

Find:

```tsx
                    {hasFingerboard && !hasStrength && !hasClimb && !isFuture && (
                      <LadderSimple size={6} weight="fill" className="absolute opacity-50" style={{ top: 1, left: 1 }} />
                    )}
                    {hasStrength && !hasFingerboard && !hasClimb && !isFuture && (
                      <Barbell size={8} weight="fill" className="opacity-50" />
                    )}
```

Replace with:

```tsx
                    {hasTraining && !hasClimb && !isFuture && (
                      hasFingerboard && hasStrength ? (
                        <span className="flex items-center gap-px opacity-50" style={{ color: TRAINING_ICON }}>
                          <LadderSimple size={6} weight="fill" />
                          <span className="text-[7px] font-bold leading-none">/</span>
                          <Barbell size={6} weight="fill" />
                        </span>
                      ) : hasFingerboard ? (
                        <LadderSimple size={8} weight="fill" className="opacity-50" style={{ color: TRAINING_ICON }} />
                      ) : (
                        <Barbell size={8} weight="fill" className="opacity-50" style={{ color: TRAINING_ICON }} />
                      )
                    )}
```

Key changes:
- One outer conditional `hasTraining && !hasClimb && !isFuture` (no `isCompDate` or `isGoalDate` because those don't exist in this file).
- Three variants in a ternary chain: FB+strength combo at `size={6}` each + `text-[7px]` slash; FB-only `size={8}`; strength-only `size={8}`.
- All variants use `color: TRAINING_ICON` and `opacity-50`.
- `LadderSimple` is centered, not `absolute`.

- [ ] **Step 4: Type-check**

Run: `cd /Users/dougcooper/Documents/Code/summit && pnpm build`

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/analytics/recent-months.tsx
git commit -m "$(cat <<'EOF'
feat(analytics): icon-only training on recent-months heatmap

Mirror the year-calendar change: drop training fills, climb is a
solid grade block, training renders as a navy icon centered in the
cell (LadderSimple/Barbell/combo via '/' separator).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Manual browser verification

- [ ] **Step 1: Start dev server**

Run: `cd /Users/dougcooper/Documents/Code/summit && pnpm dev`

- [ ] **Step 2: Walk the rendering matrix**

Open `/analytics` (RecentMonths) and `/journey` (YearCalendar). Verify each state:

1. **Rest day:** empty cell, gray Moon centered. Unchanged.
2. **FB-only day:** empty cell, navy `LadderSimple` centered.
3. **Strength-only day:** empty cell, navy `Barbell` centered.
4. **FB + strength day:** empty cell, navy `LadderSimple / Barbell` (icon + slash + icon) centered.
5. **Climb-only day:** solid grade-color block, no icon. Unchanged.
6. **Climb + FB day:** **solid grade-color block**, no icon. (Regression check — previously this showed a diagonal split.)
7. **Climb + strength day:** solid grade-color block, no icon.
8. **Climb + FB + strength day:** solid grade-color block, no icon.
9. **Comp date with no training:** gold-tinted cell, gold Trophy centered. Unchanged.
10. **Comp date with FB / strength / both training:** gold-tinted cell, gold Trophy centered. (Bug fix — previously this was crowded out by training fills.)
11. **Goal date:** checkered pattern. **No training icon overlay** even if training happened that day (new guard).
12. **Today's cell:** thicker dark border on top of whatever the underlying state is. Unchanged.

If any cell renders wrong, stop and report which state and which file.

- [ ] **Step 3: Stop the dev server**

If you started `pnpm dev` in this task, stop it (Ctrl-C in its terminal).

No commit step — verification only.

---

## Self-Review

**Spec coverage:**

| Spec section | Implemented in |
|---|---|
| Climb day = solid grade block | Task 1 (step 3), Task 2 (step 2) |
| Training day = empty cell + navy icon | Task 1 (step 6), Task 2 (step 3) |
| FB-only = LadderSimple navy | Task 1 (step 6), Task 2 (step 3) |
| Strength-only = Barbell navy | Task 1 (step 6), Task 2 (step 3) |
| FB+strength = both icons + "/" separator | Task 1 (step 6 — combo branch), Task 2 (step 3 — combo branch) |
| Trophy wins on comp dates | Pre-existing icon block; training-icon guard `!isCompDate` keeps training off |
| `!isGoalDate` training-icon guard (bug fix) | Task 1 (step 6) — newly added |
| Remove `TRAINING_FILL` / `STRENGTH_FILL` | Task 1 (step 1), Task 2 (step 1) |
| Add `TRAINING_ICON` constant | Task 1 (step 1), Task 2 (step 1) |
| Remove `splitGradient` plumbing (year-calendar only) | Task 1 (steps 2, 4) |
| Remove `if (splitGradient)` comp-date guard | Task 1 (step 5) |
| Goal-date checkered unchanged | Not touched |
| Rest-day Moon unchanged | Not touched |
| Today border unchanged | Not touched |
| Future-day dim unchanged | Not touched |

**Placeholder scan:** No TBDs. Every step shows exact code.

**Type consistency:**
- `TRAINING_ICON` is the same hex literal `"#1e3a8a"` in both files.
- The training-icon guard pattern (`hasTraining && !hasClimb && ... && !isFuture`) is consistent across both files. Year-calendar adds `!isCompDate && !isGoalDate`; recent-months doesn't need them.
- The combo `<span className="flex items-center gap-px opacity-50">` wrapper is the same shape in both files; only the icon sizes and slash font size differ (year-calendar: `size={4}` icons + `text-[5px]`; recent-months: `size={6}` icons + `text-[7px]`).
