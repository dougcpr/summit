# Heatmap Training Full-Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render training-only days as a solid color block with a centered icon, replacing the current half-triangle treatment.

**Architecture:** Two presentational components are updated in parallel: the training branch sets `bg` directly to the training fill (no `linear-gradient`), and the training icon loses its `absolute` positioning to center via the cell's flex layout. No backend changes, no schema changes.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Phosphor Icons.

**Verification convention:** Each code task ends with `pnpm build` + commit. The final task runs `pnpm dev` for a manual browser check against the rendering matrix from the spec.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/components/analytics/year-calendar.tsx` | Modify | Drop training-branch gradient, center the training icon |
| `src/components/analytics/recent-months.tsx` | Modify | Same change, parallel |

---

## Task 1: Update `YearCalendar`

**Files:**
- Modify: `/Users/dougcooper/Documents/Code/summit/src/components/analytics/year-calendar.tsx`

- [ ] **Step 1: Replace the training branch (currently lines 167-175)**

Find:

```tsx
                  } else if (hasTraining) {
                    const fill = hasFingerboard ? TRAINING_FILL : STRENGTH_FILL;
                    const borderColor = hasFingerboard ? "rgba(107,92,196,0.4)" : "rgba(245,158,11,0.5)";
                    splitGradient = `linear-gradient(135deg, ${EMPTY_COLOR} 0 50%, ${fill} 50% 100%)`;
                    bg = "transparent";
                    if (!isToday) {
                      border = `1px solid ${borderColor}`;
                    }
                  }
```

Replace with:

```tsx
                  } else if (hasTraining) {
                    const fill = hasFingerboard ? TRAINING_FILL : STRENGTH_FILL;
                    const borderColor = hasFingerboard ? "rgba(107,92,196,0.4)" : "rgba(245,158,11,0.5)";
                    bg = fill;
                    if (!isToday) {
                      border = `1px solid ${borderColor}`;
                    }
                  }
```

Only two lines change: `splitGradient = ...; bg = "transparent";` becomes `bg = fill;`. The `borderColor` line is unchanged. `splitGradient` will no longer be assigned anywhere; its declaration remains (the comp-date `if (splitGradient)` check below is now dead but is left in place per the spec's out-of-scope note).

- [ ] **Step 2: Replace the training-icon block (currently lines 221-227)**

Find:

```tsx
                      {hasTraining && !hasClimb && !isCompDate && !isFuture && (
                        hasStrength ? (
                          <Barbell size={5} weight="fill" className="absolute opacity-40" style={{ top: 0, left: 0 }} />
                        ) : (
                          <Moon size={5} weight="fill" className="absolute opacity-30" style={{ top: 0, left: 0 }} />
                        )
                      )}
```

Replace with:

```tsx
                      {hasTraining && !hasClimb && !isCompDate && !isFuture && (
                        hasStrength ? (
                          <Barbell size={6} weight="fill" className="opacity-50" />
                        ) : (
                          <Moon size={6} weight="fill" className="opacity-50" />
                        )
                      )}
                                  
```

Key changes:
- Drop `absolute` from the class list.
- Drop the `style={{ top: 0, left: 0 }}` prop.
- Bump `size` from `5` to `6` (matching the rest-day Moon at line 220).
- Set both icons to `opacity-50` (was `opacity-30`/`opacity-40`).

The icon now centers via the cell's `flex items-center justify-center` (set on line 208) and reads cleanly against the colored block.

- [ ] **Step 3: Type-check**

Run: `cd /Users/dougcooper/Documents/Code/summit && pnpm build`

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/analytics/year-calendar.tsx
git commit -m "$(cat <<'EOF'
feat(analytics): full-block training cells on year calendar

Training-only days (fingerboard or strength) now render as a solid
color block with a centered icon instead of a half-triangle with an
icon in the empty top-left half. Color carries the meaning; the empty
half added visual noise. Icon opacity bumped to 50 to read against
the fill.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Update `RecentMonths`

**Files:**
- Modify: `/Users/dougcooper/Documents/Code/summit/src/components/analytics/recent-months.tsx`

- [ ] **Step 1: Replace the training branch (currently lines 125-133)**

Find:

```tsx
                } else if (hasTraining) {
                  const fill = hasFingerboard ? TRAINING_FILL : STRENGTH_FILL;
                  const borderColor = hasFingerboard ? "rgba(107,92,196,0.4)" : "rgba(245,158,11,0.5)";
                  backgroundImage = `linear-gradient(135deg, ${EMPTY_COLOR} 0 50%, ${fill} 50% 100%)`;
                  bg = "transparent";
                  if (!isToday) {
                    border = `1px solid ${borderColor}`;
                  }
                }
```

Replace with:

```tsx
                } else if (hasTraining) {
                  const fill = hasFingerboard ? TRAINING_FILL : STRENGTH_FILL;
                  const borderColor = hasFingerboard ? "rgba(107,92,196,0.4)" : "rgba(245,158,11,0.5)";
                  bg = fill;
                  if (!isToday) {
                    border = `1px solid ${borderColor}`;
                  }
                }
```

Two lines change: `backgroundImage = ...; bg = "transparent";` becomes `bg = fill;`.

`backgroundImage` is still declared and passed to the style prop — it remains `undefined` in this path and that's fine (React ignores undefined style values).

- [ ] **Step 2: Replace the training-icon block (currently lines 148-154)**

Find:

```tsx
                    {hasTraining && !hasClimb && !isFuture && (
                      hasStrength ? (
                        <Barbell size={6} weight="fill" className="absolute opacity-40" style={{ top: 1, left: 1 }} />
                      ) : (
                        <Moon size={6} weight="fill" className="absolute opacity-30" style={{ top: 1, left: 1 }} />
                      )
                    )}
```

Replace with:

```tsx
                    {hasTraining && !hasClimb && !isFuture && (
                      hasStrength ? (
                        <Barbell size={8} weight="fill" className="opacity-50" />
                      ) : (
                        <Moon size={8} weight="fill" className="opacity-50" />
                      )
                    )}
```

Key changes:
- Drop `absolute` from the class list.
- Drop the `style={{ top: 1, left: 1 }}` prop.
- Bump `size` from `6` to `8` (matching the rest-day Moon at line 147).
- Set both icons to `opacity-50`.

- [ ] **Step 3: Type-check**

Run: `cd /Users/dougcooper/Documents/Code/summit && pnpm build`

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/analytics/recent-months.tsx
git commit -m "$(cat <<'EOF'
feat(analytics): full-block training cells on recent-months heatmap

Mirror the year-calendar change: training days are solid color blocks
with centered icons, no more half-triangle.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Manual browser verification

- [ ] **Step 1: Start dev server**

Run: `cd /Users/dougcooper/Documents/Code/summit && pnpm dev`

- [ ] **Step 2: Walk the rendering matrix**

Open both `/analytics` (RecentMonths) and `/journey` (YearCalendar). Verify each state against the spec matrix:

1. **Rest day:** empty cell, Moon centered. Unchanged.
2. **Fingerboard-only day:** full indigo block, Moon centered.
3. **Strength-only day:** full yellow block, Barbell centered.
4. **Fingerboard + strength day:** full indigo block (FB wins on color), Barbell centered (strength wins on icon).
5. **Climb-only day:** solid grade-color block, no icon. Unchanged.
6. **Climb + fingerboard day:** solid grade-color block, no icon. Unchanged (no training visual on climb days).
7. **Climb + strength day:** solid grade-color block, no icon. Unchanged.
8. **Goal date:** checkered pattern. Unchanged.
9. **Competition date:** gold tint with Trophy centered. Unchanged.
10. **Today's cell:** thicker dark border. Unchanged.

If you don't have a strength-only day to verify, log a strength session from `/log` on a no-FB, no-climb day.

If any cell renders wrong, stop and report which state and which file.

- [ ] **Step 3: Stop the dev server**

If you started `pnpm dev` in this task, stop it (Ctrl-C in its terminal).

No commit step — verification only.

---

## Self-Review

**Spec coverage:**

| Spec requirement | Implemented in |
|---|---|
| Training-only days render as solid color block | Tasks 1 (step 1), 2 (step 1) |
| Icon centered on the block | Tasks 1 (step 2), 2 (step 2) |
| Icon size matches rest-day Moon per file | Tasks 1 (step 2 → size 6), 2 (step 2 → size 8) |
| Icon opacity bumped to 50 | Tasks 1 (step 2), 2 (step 2) |
| Color rule unchanged (indigo if FB, yellow otherwise) | Tasks 1 (step 1), 2 (step 1) — `hasFingerboard ? TRAINING_FILL : STRENGTH_FILL` preserved |
| Icon rule unchanged (Moon if FB-only, Barbell if strength present) | Tasks 1 (step 2), 2 (step 2) — `hasStrength ? Barbell : Moon` preserved |
| Climb branch unchanged | Not touched by any task |
| Rest-day Moon unchanged | Not touched by any task |
| Goal/comp date overrides unchanged | Not touched by any task |
| `splitGradient` left in place (out of scope) | Spec acknowledges; year-calendar's declaration remains untouched |

**Placeholder scan:** No TBDs. Every step shows exact code.

**Type consistency:**
- `hasFingerboard` / `hasStrength` are the same boolean derivations used in the prior commits.
- `TRAINING_FILL` / `STRENGTH_FILL` constants are unchanged across both files.
- Icon component imports (`Moon`, `Barbell`) already exist in both files; no new imports needed.
