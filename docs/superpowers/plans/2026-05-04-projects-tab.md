# Projects Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Projects tab for tracking incremental progress on multi-session boulder problems via photo-overlay markers.

**Architecture:** Three new TanStack file-based routes (`/projects`, `/projects/new`, `/projects/$projectId`) backed by two new Convex tables (`projects`, `projectMoves`) and a nullable `projectId` foreign key on the existing `climbs` table. Photos are stored in Convex file storage; marker positions are stored as fractional `0..1` coordinates so they scale with viewport size. The Log page is untouched — quick-log climbs continue to write `climbs` rows with `projectId === undefined`.

**Tech Stack:** React 19, TanStack Router, Convex 1.32, Clerk auth, Tailwind 4, Phosphor icons, oxlint, oxfmt, rsbuild, TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-04-projects-tab-design.md`

**Testing approach:** The repo has no test runner. Each task is verified by `pnpm lint` + `npx tsc --noEmit` + manual browser verification once a visible surface exists. Adding test infrastructure is out of scope.

---

## File structure

```
convex/
  schema.ts                          ← MODIFY: add projects, projectMoves tables; add projectId to climbs
  climbs.ts                          ← MODIFY: accept optional projectId in add()
  projects.ts                        ← CREATE: CRUD for projects + projectMoves
src/lib/
  vocabulary.ts                      ← CREATE: static climbing vocab catalog
  image-resize.ts                    ← CREATE: client-side canvas downscale before upload
src/components/projects/
  photo-upload.tsx                   ← CREATE: pick + resize + upload, returns storageId
  vocab-chip-picker.tsx              ← CREATE: multi-select chips with long-press defs
  project-marker.tsx                 ← CREATE: numbered circle, state-colored
  attempt-button.tsx                 ← CREATE: "+ attempt today" button
  move-detail-sheet.tsx              ← CREATE: bottom sheet with state, vocab, notes, delete
  project-canvas.tsx                 ← CREATE: photo + markers + gestures
  project-card.tsx                   ← CREATE: list-page card
src/routes/
  projects.tsx                       ← CREATE: list page
  projects.new.tsx                   ← CREATE: create flow
  projects.$projectId.tsx            ← CREATE: detail page
  __root.tsx                         ← MODIFY: add Projects nav link
```

---

## Task 1: Schema migration

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Edit the schema**

Replace the file contents with:

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  climbs: defineTable({
    userId: v.string(),
    grade: v.string(),
    completed: v.boolean(),
    holdType: v.string(),
    climbedAt: v.number(),
    projectId: v.optional(v.id("projects")),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "climbedAt"])
    .index("by_project", ["projectId"]),

  notes: defineTable({
    userId: v.string(),
    content: v.string(),
    date: v.string(),
  }).index("by_user_date", ["userId", "date"]),

  analyticsCache: defineTable({
    userId: v.string(),
    queryKey: v.string(),
    result: v.string(),
    updatedAt: v.number(),
  })
    .index("by_user_key", ["userId", "queryKey"])
    .index("by_user", ["userId"]),

  projects: defineTable({
    userId: v.string(),
    name: v.string(),
    grade: v.string(),
    holdType: v.string(),
    photoStorageId: v.id("_storage"),
    status: v.union(v.literal("active"), v.literal("sent")),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
  })
    .index("by_user_status", ["userId", "status"])
    .index("by_user", ["userId"]),

  projectMoves: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
    order: v.number(),
    x: v.number(),
    y: v.number(),
    state: v.union(
      v.literal("todo"),
      v.literal("working"),
      v.literal("done"),
    ),
    vocabTags: v.array(v.string()),
    notes: v.string(),
  }).index("by_project", ["projectId"]),
});
```

- [ ] **Step 2: Verify Convex regenerates types**

Run: `pnpm dev` (in a separate terminal — leave running). The `convex` dev process auto-regenerates `convex/_generated/dataModel.d.ts`. Wait until you see "Convex functions ready" log line. Then stop the dev server.

Expected: no error logs from Convex; `convex/_generated/dataModel.d.ts` mentions `projects` and `projectMoves`.

- [ ] **Step 3: Lint and typecheck**

Run: `pnpm lint`
Expected: passes

Run: `npx tsc --noEmit`
Expected: passes

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/_generated/
git commit -m "feat(projects): add projects and projectMoves tables, projectId on climbs"
```

---

## Task 2: Vocabulary catalog

**Files:**
- Create: `src/lib/vocabulary.ts`

- [ ] **Step 1: Create the file**

```ts
export const VOCAB = [
  // Hand techniques
  { id: "crimp",       label: "Crimp",       definition: "Fingertip grip on a small edge" },
  { id: "open-hand",   label: "Open hand",   definition: "Relaxed grip across a hold" },
  { id: "pinch",       label: "Pinch",       definition: "Thumb opposing fingers" },
  { id: "gaston",      label: "Gaston",      definition: "Sideways press with elbow out, thumb down" },
  { id: "undercling",  label: "Undercling",  definition: "Hold gripped from below" },
  { id: "sidepull",    label: "Sidepull",    definition: "Vertical hold pulled sideways" },
  // Foot techniques
  { id: "heel-hook",   label: "Heel hook",   definition: "Hooking the heel onto a hold to pull" },
  { id: "toe-hook",    label: "Toe hook",    definition: "Hooking the top of the toes" },
  { id: "drop-knee",   label: "Drop knee",   definition: "Inside knee drops to engage hip rotation" },
  { id: "smear",       label: "Smear",       definition: "Foot pressed flat against the wall" },
  { id: "flag",        label: "Flag",        definition: "Free leg counterbalances the body" },
  // Body movements
  { id: "deadpoint",   label: "Deadpoint",   definition: "Latch a hold at the apex of momentum" },
  { id: "dyno",        label: "Dyno",        definition: "Both hands leave the wall mid-move" },
  { id: "lock-off",    label: "Lock-off",    definition: "Static hold with bent arm" },
  { id: "mantle",      label: "Mantle",      definition: "Press up onto a hold from below" },
  { id: "compression", label: "Compression", definition: "Squeeze opposing holds inward" },
  { id: "match",       label: "Match",       definition: "Both hands or feet share one hold" },
] as const;

export type VocabId = (typeof VOCAB)[number]["id"];

export function findVocab(id: string) {
  return VOCAB.find((v) => v.id === id);
}
```

- [ ] **Step 2: Lint and typecheck**

Run: `pnpm lint && npx tsc --noEmit`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add src/lib/vocabulary.ts
git commit -m "feat(projects): add static vocabulary catalog"
```

---

## Task 3: Image resize utility

**Files:**
- Create: `src/lib/image-resize.ts`

- [ ] **Step 1: Create the file**

```ts
const MAX_LONG_EDGE = 1600;
const JPEG_QUALITY = 0.85;

export async function resizeImageToBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const longEdge = Math.max(width, height);
  const scale = longEdge > MAX_LONG_EDGE ? MAX_LONG_EDGE / longEdge : 1;
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d context unavailable");
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob returned null"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}
```

- [ ] **Step 2: Lint and typecheck**

Run: `pnpm lint && npx tsc --noEmit`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add src/lib/image-resize.ts
git commit -m "feat(projects): add client-side image resize utility"
```

---

## Task 4: Convex projects backend

**Files:**
- Create: `convex/projects.ts`

- [ ] **Step 1: Create the file**

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

async function getUserId(ctx: {
  auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.tokenIdentifier;
}

const moveStateValidator = v.union(
  v.literal("todo"),
  v.literal("working"),
  v.literal("done"),
);

// ─── Photo upload ────────────────────────────────────────────────────────────

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getPhotoUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await getUserId(ctx);
    return await ctx.storage.getUrl(args.storageId);
  },
});

// ─── Projects ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    name: v.string(),
    grade: v.string(),
    holdType: v.string(),
    photoStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    return await ctx.db.insert("projects", {
      ...args,
      userId,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  args: { status: v.union(v.literal("active"), v.literal("sent")) },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", args.status),
      )
      .order("desc")
      .collect();

    // Roll up moves and attempts per project (single scan each)
    const allMoves = await ctx.db
      .query("projectMoves")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    const allClimbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return projects.map((p) => {
      const moves = allMoves.filter((m) => m.projectId === p._id);
      const climbs = allClimbs.filter((c) => c.projectId === p._id);
      const sessionDays = new Set(
        climbs.map((c) => new Date(c.climbedAt).toDateString()),
      ).size;
      return {
        ...p,
        moveCount: moves.length,
        movesDone: moves.filter((m) => m.state === "done").length,
        attempts: climbs.length,
        sessionDays,
      };
    });
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== userId) return null;
    const photoUrl = await ctx.storage.getUrl(project.photoStorageId);
    return { ...project, photoUrl };
  },
});

export const rename = mutation({
  args: { id: v.id("projects"), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id, { name: args.name });
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== userId) throw new Error("Not found");

    // Cascade delete moves
    const moves = await ctx.db
      .query("projectMoves")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    for (const m of moves) await ctx.db.delete(m._id);

    // Null out projectId on related climbs (don't delete attempt history)
    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    for (const c of climbs) await ctx.db.patch(c._id, { projectId: undefined });

    // Delete photo from storage
    await ctx.storage.delete(project.photoStorageId);

    await ctx.db.delete(args.id);
  },
});

// ─── Project moves ───────────────────────────────────────────────────────────

export const listMoves = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) return [];
    return await ctx.db
      .query("projectMoves")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const addMove = mutation({
  args: {
    projectId: v.id("projects"),
    x: v.number(),
    y: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) throw new Error("Not found");

    const existing = await ctx.db
      .query("projectMoves")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    const nextOrder = existing.reduce((m, mv) => Math.max(m, mv.order), 0) + 1;

    const moveId = await ctx.db.insert("projectMoves", {
      projectId: args.projectId,
      userId,
      order: nextOrder,
      x: clamp01(args.x),
      y: clamp01(args.y),
      state: "todo",
      vocabTags: [],
      notes: "",
    });

    // Adding a move to a sent project flips it back to active
    if (project.status === "sent") {
      await ctx.db.patch(args.projectId, { status: "active", sentAt: undefined });
    }

    return moveId;
  },
});

export const updateMoveState = mutation({
  args: {
    id: v.id("projectMoves"),
    state: moveStateValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const move = await ctx.db.get(args.id);
    if (!move || move.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id, { state: args.state });
    await reconcileProjectStatus(ctx, move.projectId);
  },
});

export const updateMoveVocab = mutation({
  args: {
    id: v.id("projectMoves"),
    vocabTags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const move = await ctx.db.get(args.id);
    if (!move || move.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id, { vocabTags: args.vocabTags });
  },
});

export const updateMoveNotes = mutation({
  args: {
    id: v.id("projectMoves"),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const move = await ctx.db.get(args.id);
    if (!move || move.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id, { notes: args.notes });
  },
});

export const updateMovePosition = mutation({
  args: {
    id: v.id("projectMoves"),
    x: v.number(),
    y: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const move = await ctx.db.get(args.id);
    if (!move || move.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id, { x: clamp01(args.x), y: clamp01(args.y) });
  },
});

export const deleteMove = mutation({
  args: { id: v.id("projectMoves") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const move = await ctx.db.get(args.id);
    if (!move || move.userId !== userId) throw new Error("Not found");
    const projectId = move.projectId;
    await ctx.db.delete(args.id);
    await reconcileProjectStatus(ctx, projectId);
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

async function reconcileProjectStatus(
  ctx: { db: { query: any; get: any; patch: any } },
  projectId: Id<"projects">,
) {
  const project = await ctx.db.get(projectId);
  if (!project) return;
  const moves = await ctx.db
    .query("projectMoves")
    .withIndex("by_project", (q: any) => q.eq("projectId", projectId))
    .collect();

  const allDone = moves.length > 0 && moves.every((m: any) => m.state === "done");
  const shouldBeSent = allDone;
  const isSent = project.status === "sent";

  if (shouldBeSent && !isSent) {
    await ctx.db.patch(projectId, { status: "sent", sentAt: Date.now() });
  } else if (!shouldBeSent && isSent) {
    await ctx.db.patch(projectId, { status: "active", sentAt: undefined });
  }
}
```

> **Note on the `ctx` typing in `reconcileProjectStatus`:** Convex's generated types make the full `MutationCtx` type cumbersome to import inline. Using `any` on the helper is a deliberate, scoped escape hatch — the public mutations have full type safety; the helper is private to this file.

- [ ] **Step 2: Lint and typecheck**

Run: `pnpm lint && npx tsc --noEmit`
Expected: passes

- [ ] **Step 3: Verify Convex types regenerate**

If `pnpm dev` is running, watch for "Convex functions ready". If not running, start it briefly.

Expected: `convex/_generated/api.d.ts` includes `api.projects.create`, `api.projects.list`, `api.projects.get`, etc.

- [ ] **Step 4: Commit**

```bash
git add convex/projects.ts convex/_generated/
git commit -m "feat(projects): add Convex backend for projects and moves"
```

---

## Task 5: Modify climbs.add to accept optional projectId

**Files:**
- Modify: `convex/climbs.ts:43-60`

- [ ] **Step 1: Edit the `add` mutation**

Replace the `add` mutation in `convex/climbs.ts` with:

```ts
export const add = mutation({
  args: {
    grade: v.string(),
    completed: v.boolean(),
    holdType: v.string(),
    climbedAt: v.number(),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const result = await ctx.db.insert("climbs", { ...args, userId });

    // Schedule analytics cache recomputation
    const goalGrade = await getGoalGradeFromCache(ctx, userId);
    await ctx.scheduler.runAfter(0, internal.analyticsCache.recompute, { userId, goalGrade });

    return result;
  },
});
```

- [ ] **Step 2: Lint and typecheck**

Run: `pnpm lint && npx tsc --noEmit`
Expected: passes — existing call sites pass no `projectId` and the field is optional

- [ ] **Step 3: Manually verify the existing log page still works**

Run: `pnpm dev`. Navigate to `/log`. Tap an attempt and a send. Both should write rows as before (no `projectId` set). Check the chips appear.

- [ ] **Step 4: Commit**

```bash
git add convex/climbs.ts
git commit -m "feat(projects): allow climbs.add to associate with a project"
```

---

## Task 6: PhotoUpload component

**Files:**
- Create: `src/components/projects/photo-upload.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { Camera } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { resizeImageToBlob } from "../../lib/image-resize";

interface PhotoUploadProps {
  onUploaded: (storageId: Id<"_storage">, previewUrl: string) => void;
}

type Status = "idle" | "uploading" | "done" | "error";

export function PhotoUpload({ onUploaded }: PhotoUploadProps) {
  const generateUploadUrl = useMutation(api.projects.generateUploadUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setStatus("uploading");
    setErrorMsg(null);
    try {
      const blob = await resizeImageToBlob(file);
      const localUrl = URL.createObjectURL(blob);
      setPreviewUrl(localUrl);

      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };

      setStatus("done");
      onUploaded(storageId, localUrl);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
      setPreviewUrl(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const retake = () => {
    setStatus("idle");
    setPreviewUrl(null);
    setErrorMsg(null);
    inputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
      {status === "idle" ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-[4/3] bg-card-bg border-2 border-dashed border-border/30 rounded-lg flex flex-col items-center justify-center text-border/60 active:brightness-95"
        >
          <Camera size={48} weight="bold" />
          <span className="mt-2 text-sm">Take or choose photo</span>
        </button>
      ) : (
        <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-card-bg">
          {previewUrl && (
            <img src={previewUrl} alt="Project" className="w-full h-full object-cover" />
          )}
          {status === "uploading" && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span className="text-white text-sm">Uploading…</span>
            </div>
          )}
          {status === "done" && (
            <button
              onClick={retake}
              className="absolute bottom-2 right-2 px-3 py-1.5 bg-card-bg text-border text-sm rounded-md active:brightness-95"
            >
              Retake
            </button>
          )}
        </div>
      )}
      {status === "error" && errorMsg && (
        <div className="mt-2 text-sm text-red-700">
          {errorMsg}{" "}
          <button onClick={retake} className="underline">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Lint and typecheck**

Run: `pnpm lint && npx tsc --noEmit`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/photo-upload.tsx
git commit -m "feat(projects): add PhotoUpload component with client-side resize"
```

---

## Task 7: VocabChipPicker component

**Files:**
- Create: `src/components/projects/vocab-chip-picker.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState, useRef } from "react";
import { VOCAB, type VocabId } from "../../lib/vocabulary";

interface VocabChipPickerProps {
  selected: string[];
  onChange: (next: string[]) => void;
}

export function VocabChipPicker({ selected, onChange }: VocabChipPickerProps) {
  const [definedFor, setDefinedFor] = useState<VocabId | null>(null);
  const longPressTimer = useRef<number | null>(null);

  const isSelected = (id: string) => selected.includes(id);

  const toggle = (id: string) => {
    if (isSelected(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const startLongPress = (id: VocabId) => {
    longPressTimer.current = window.setTimeout(() => {
      setDefinedFor(id);
      longPressTimer.current = null;
    }, 400);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerUp = (id: VocabId) => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      toggle(id);
    }
  };

  const definedItem = definedFor ? VOCAB.find((v) => v.id === definedFor) : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {VOCAB.map((v) => {
          const sel = isSelected(v.id);
          return (
            <button
              key={v.id}
              onPointerDown={() => startLongPress(v.id)}
              onPointerUp={() => handlePointerUp(v.id)}
              onPointerLeave={cancelLongPress}
              onPointerCancel={cancelLongPress}
              className={`px-2.5 py-1.5 rounded-full text-xs font-display ${
                sel
                  ? "bg-primary text-border font-bold"
                  : "bg-card-bg text-border/70 border border-border/20"
              } active:brightness-95`}
            >
              {sel ? "✓ " : ""}
              {v.label}
            </button>
          );
        })}
      </div>
      {definedItem && (
        <div
          onClick={() => setDefinedFor(null)}
          className="bg-card-bg border border-border/20 rounded-md p-2 text-xs text-border/80"
        >
          <span className="font-bold">{definedItem.label}:</span>{" "}
          {definedItem.definition}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Lint and typecheck**

Run: `pnpm lint && npx tsc --noEmit`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/vocab-chip-picker.tsx
git commit -m "feat(projects): add VocabChipPicker with long-press definitions"
```

---

## Task 8: ProjectMarker component

**Files:**
- Create: `src/components/projects/project-marker.tsx`

- [ ] **Step 1: Create the component**

```tsx
type MoveState = "todo" | "working" | "done";

interface ProjectMarkerProps {
  number: number;
  state: MoveState;
  x: number; // 0..1
  y: number; // 0..1
  onPointerDown?: (e: React.PointerEvent) => void;
}

const stateStyle: Record<MoveState, { fill: string; border: string; dashed: boolean; text: string }> = {
  todo:    { fill: "#d8d2c4", border: "#5a5a5a", dashed: false, text: "#3a3a3a" },
  working: { fill: "#bcd2ec", border: "#2d4a6b", dashed: true,  text: "#1d3a5b" },
  done:    { fill: "#a9c7a0", border: "#3a4a35", dashed: false, text: "#2a3a25" },
};

export function ProjectMarker({ number, state, x, y, onPointerDown }: ProjectMarkerProps) {
  const s = stateStyle[state];
  return (
    <button
      onPointerDown={onPointerDown}
      className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center font-display font-bold rounded-full text-sm select-none touch-none"
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: 32,
        height: 32,
        backgroundColor: s.fill,
        border: `2px ${s.dashed ? "dashed" : "solid"} ${s.border}`,
        color: s.text,
      }}
    >
      {number}
    </button>
  );
}
```

- [ ] **Step 2: Lint and typecheck**

Run: `pnpm lint && npx tsc --noEmit`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/project-marker.tsx
git commit -m "feat(projects): add ProjectMarker component"
```

---

## Task 9: AttemptButton component

**Files:**
- Create: `src/components/projects/attempt-button.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { Plus } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

interface AttemptButtonProps {
  projectId: Id<"projects">;
  grade: string;
  holdType: string;
}

export function AttemptButton({ projectId, grade, holdType }: AttemptButtonProps) {
  const addClimb = useMutation(api.climbs.add);
  const [pulsing, setPulsing] = useState(false);

  const handleClick = async () => {
    setPulsing(true);
    await addClimb({
      grade,
      completed: false,
      holdType,
      climbedAt: Date.now(),
      projectId,
    });
    setTimeout(() => setPulsing(false), 600);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full py-4 rounded-lg flex items-center justify-center gap-2 text-border font-display font-bold active:brightness-90 ${
        pulsing ? "animate-pulse" : ""
      }`}
      style={{ backgroundColor: "#d96c4f" }}
    >
      <Plus size={24} weight="bold" />
      <span>attempt today</span>
    </button>
  );
}
```

- [ ] **Step 2: Lint and typecheck**

Run: `pnpm lint && npx tsc --noEmit`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/attempt-button.tsx
git commit -m "feat(projects): add AttemptButton component"
```

---

## Task 10: MoveDetailSheet component

**Files:**
- Create: `src/components/projects/move-detail-sheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { X } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { VocabChipPicker } from "./vocab-chip-picker";

type MoveState = "todo" | "working" | "done";

interface MoveDetailSheetProps {
  move: Doc<"projectMoves"> | null;
  onClose: () => void;
}

const STATES: { value: MoveState; label: string; emoji: string }[] = [
  { value: "todo", label: "todo", emoji: "⚪" },
  { value: "working", label: "working", emoji: "🔵" },
  { value: "done", label: "done", emoji: "🟢" },
];

export function MoveDetailSheet({ move, onClose }: MoveDetailSheetProps) {
  const updateState = useMutation(api.projects.updateMoveState);
  const updateVocab = useMutation(api.projects.updateMoveVocab);
  const updateNotes = useMutation(api.projects.updateMoveNotes);
  const deleteMove = useMutation(api.projects.deleteMove);

  const [notesDraft, setNotesDraft] = useState("");

  useEffect(() => {
    if (move) setNotesDraft(move.notes);
  }, [move?._id]);

  if (!move) return null;

  const handleStateChange = (next: MoveState) => {
    updateState({ id: move._id as Id<"projectMoves">, state: next });
  };

  const handleVocabChange = (next: string[]) => {
    updateVocab({ id: move._id as Id<"projectMoves">, vocabTags: next });
  };

  const handleNotesBlur = () => {
    if (notesDraft !== move.notes) {
      updateNotes({ id: move._id as Id<"projectMoves">, notes: notesDraft });
    }
  };

  const handleDelete = () => {
    if (confirm(`Delete move ${move.order}?`)) {
      deleteMove({ id: move._id as Id<"projectMoves"> });
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/30 z-40"
        aria-label="Close sheet"
      />
      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-bg rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 bg-border/20 rounded-full" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-border">
            Move {move.order}
          </h2>
          <button onClick={onClose} className="p-1 active:brightness-90">
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-xs uppercase font-display text-muted mb-2">State</p>
          <div className="flex gap-2">
            {STATES.map((s) => {
              const sel = move.state === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => handleStateChange(s.value)}
                  className={`flex-1 py-2 rounded-md text-sm font-display ${
                    sel
                      ? "bg-primary text-border font-bold"
                      : "bg-card-bg text-border/70 border border-border/20"
                  }`}
                >
                  {s.emoji} {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs uppercase font-display text-muted mb-2">Vocab</p>
          <VocabChipPicker selected={move.vocabTags} onChange={handleVocabChange} />
        </div>

        <div className="mb-4">
          <p className="text-xs uppercase font-display text-muted mb-2">Notes</p>
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={handleNotesBlur}
            rows={3}
            placeholder="High right heel, thumb catch on the gaston…"
            className="w-full p-2 rounded-md bg-card-bg border border-border/20 text-sm font-display text-border resize-none"
          />
        </div>

        <button
          onClick={handleDelete}
          className="w-full py-2 text-sm text-muted underline font-display"
        >
          Delete move
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Lint and typecheck**

Run: `pnpm lint && npx tsc --noEmit`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/move-detail-sheet.tsx
git commit -m "feat(projects): add MoveDetailSheet component"
```

---

## Task 11: ProjectCanvas component

**Files:**
- Create: `src/components/projects/project-canvas.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useRef, useState, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { ProjectMarker } from "./project-marker";

interface ProjectCanvasProps {
  projectId: Id<"projects">;
  photoUrl: string;
  moves: Doc<"projectMoves">[];
  onMarkerTap: (move: Doc<"projectMoves">) => void;
}

const LONG_PRESS_MS = 200;
const DRAG_THRESHOLD_PX = 6;

interface DragState {
  moveId: Id<"projectMoves">;
  startClientX: number;
  startClientY: number;
  armedAt: number;
  isDragging: boolean;
  liveX: number; // fractional 0..1, current visual position during drag
  liveY: number;
}

export function ProjectCanvas({ projectId, photoUrl, moves, onMarkerTap }: ProjectCanvasProps) {
  const addMove = useMutation(api.projects.addMove);
  const updatePosition = useMutation(api.projects.updateMovePosition);
  const photoRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const sortedMoves = [...moves].sort((a, b) => a.order - b.order);

  const photoToFractional = useCallback((clientX: number, clientY: number) => {
    const el = photoRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return { x, y };
  }, []);

  // Tap on empty area = drop next-numbered marker
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (drag?.isDragging) return; // suppress click after a drag
    const target = e.target as HTMLElement;
    if (target.closest("[data-marker]")) return; // marker handles its own clicks
    const coords = photoToFractional(e.clientX, e.clientY);
    if (coords) addMove({ projectId, x: coords.x, y: coords.y });
  };

  // Marker pointer-down: arm a potential drag-or-tap
  const handleMarkerPointerDown = (move: Doc<"projectMoves">) => (e: React.PointerEvent) => {
    e.stopPropagation();
    setDrag({
      moveId: move._id as Id<"projectMoves">,
      startClientX: e.clientX,
      startClientY: e.clientY,
      armedAt: Date.now(),
      isDragging: false,
      liveX: move.x,
      liveY: move.y,
    });
  };

  // Pointer-move/up handling — re-binds when drag changes
  useEffect(() => {
    if (!drag) return;
    let current = drag;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - current.startClientX;
      const dy = e.clientY - current.startClientY;
      const elapsed = Date.now() - current.armedAt;
      const movedEnough = Math.hypot(dx, dy) > DRAG_THRESHOLD_PX;

      const shouldStartDrag =
        !current.isDragging && (movedEnough || elapsed > LONG_PRESS_MS);

      if (current.isDragging || shouldStartDrag) {
        const coords = photoToFractional(e.clientX, e.clientY);
        if (coords) {
          current = {
            ...current,
            isDragging: true,
            liveX: coords.x,
            liveY: coords.y,
          };
          setDrag(current);
        } else if (shouldStartDrag) {
          current = { ...current, isDragging: true };
          setDrag(current);
        }
      }
    };

    const onUp = () => {
      const wasDragging = current.isDragging;
      const movedTo = { x: current.liveX, y: current.liveY };
      const m = moves.find((mv) => (mv._id as string) === (current.moveId as string));
      setDrag(null);
      if (wasDragging) {
        updatePosition({ id: current.moveId, x: movedTo.x, y: movedTo.y });
      } else if (m) {
        onMarkerTap(m);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag?.moveId, moves, onMarkerTap, photoToFractional, updatePosition]);

  return (
    <div className="flex flex-col items-center w-full">
      <div
        ref={photoRef}
        onClick={handleCanvasClick}
        className="relative w-full max-w-md aspect-[3/4] bg-card-bg rounded-lg overflow-hidden touch-none"
      >
        <img
          src={photoUrl}
          alt="Project wall"
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
        {sortedMoves.map((m, idx) => {
          const isBeingDragged =
            drag?.isDragging && (drag.moveId as string) === (m._id as string);
          return (
            <span key={m._id} data-marker>
              <ProjectMarker
                number={idx + 1}
                state={m.state}
                x={isBeingDragged ? drag.liveX : m.x}
                y={isBeingDragged ? drag.liveY : m.y}
                onPointerDown={handleMarkerPointerDown(m)}
              />
            </span>
          );
        })}
      </div>
      {sortedMoves.length === 0 && (
        <p className="mt-2 text-xs text-muted font-display">
          Tap a hold to add a move
        </p>
      )}
    </div>
  );
}
```

> **Notes on the gesture model:**
> - **Tap vs drag:** A pointer-down on a marker arms a candidate gesture. If the user releases before moving past `DRAG_THRESHOLD_PX` AND before `LONG_PRESS_MS` elapses, it's treated as a tap → `onMarkerTap`. Otherwise it becomes a drag.
> - **Visual follow during drag:** Marker render position uses the local `liveX/liveY` while dragging, so the marker tracks the finger smoothly. The Convex `updatePosition` mutation is called only once on pointer-up, avoiding a network roundtrip per pointermove event.
> - **Why `current` mutable inside effect:** the pointermove handler needs to see the latest `isDragging`/`liveX`/`liveY` without re-binding the effect on every move. Using a local `let current` mirrors React state but avoids the re-bind churn.

- [ ] **Step 2: Lint and typecheck**

Run: `pnpm lint && npx tsc --noEmit`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/project-canvas.tsx
git commit -m "feat(projects): add ProjectCanvas with tap-to-drop and drag-to-reposition"
```

---

## Task 12: ProjectCard component

**Files:**
- Create: `src/components/projects/project-card.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { holdTypeConfig, type HoldType } from "../../lib/grades";

interface ProjectCardProps {
  project: {
    _id: Id<"projects">;
    name: string;
    grade: string;
    holdType: string;
    photoStorageId: Id<"_storage">;
    moveCount: number;
    movesDone: number;
    attempts: number;
    sessionDays: number;
  };
  onClick: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const photoUrl = useQuery(api.projects.getPhotoUrl, {
    storageId: project.photoStorageId,
  });
  const holdCfg = holdTypeConfig[project.holdType as HoldType];

  return (
    <button
      onClick={onClick}
      className="w-full bg-card-bg rounded-lg overflow-hidden flex gap-3 p-2 active:brightness-95"
    >
      <div className="w-16 h-16 shrink-0 bg-neutral-bg rounded-md overflow-hidden">
        {photoUrl && (
          <img src={photoUrl} alt="" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col items-start text-left">
        <h3 className="font-display font-bold text-border text-base truncate">
          {project.name}
        </h3>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-display font-bold text-border"
            style={{ backgroundColor: holdCfg?.color ?? "var(--color-primary)" }}
          >
            {project.grade}
          </span>
          <span className="text-xs text-muted">{holdCfg?.label}</span>
          <span className="text-xs text-border/70 font-display">
            {project.movesDone}/{project.moveCount}
          </span>
        </div>
        <p className="text-xs text-muted mt-1 font-display">
          {project.attempts} attempts · {project.sessionDays} days
        </p>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Lint and typecheck**

Run: `pnpm lint && npx tsc --noEmit`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/project-card.tsx
git commit -m "feat(projects): add ProjectCard component"
```

---

## Task 13: New project route (`/projects/new`)

**Files:**
- Create: `src/routes/projects.new.tsx`

- [ ] **Step 1: Create the route**

```tsx
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { CaretLeft } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { GRADES } from "../lib/grades";
import { PhotoUpload } from "../components/projects/photo-upload";

export const Route = createFileRoute("/projects/new")({
  component: NewProjectPage,
});

function NewProjectPage() {
  const navigate = useNavigate();
  const create = useMutation(api.projects.create);

  const [photoStorageId, setPhotoStorageId] = useState<Id<"_storage"> | null>(null);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("V5");
  const [holdType, setHoldType] = useState<"jug" | "crimp" | "sloper">("crimp");
  const [creating, setCreating] = useState(false);

  const canCreate = !!photoStorageId && name.trim().length > 0 && !creating;

  const handleCreate = async () => {
    if (!photoStorageId) return;
    setCreating(true);
    try {
      const id = await create({
        name: name.trim(),
        grade,
        holdType,
        photoStorageId,
      });
      navigate({ to: "/projects/$projectId", params: { projectId: id } });
    } catch (err) {
      setCreating(false);
      alert(err instanceof Error ? err.message : "Failed to create project");
    }
  };

  return (
    <div className="px-4 pt-4 pb-8 font-display max-w-lg mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate({ to: "/projects", search: { status: "active" } })}
          className="p-1 active:brightness-90"
        >
          <CaretLeft size={24} weight="bold" />
        </button>
        <h1 className="text-xl font-bold text-border">New project</h1>
      </div>

      <div>
        <p className="text-xs uppercase text-muted mb-2">1. Photo</p>
        <PhotoUpload onUploaded={(id) => setPhotoStorageId(id)} />
      </div>

      <div>
        <p className="text-xs uppercase text-muted mb-2">2. Name</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='e.g. "Slab project"'
          className="w-full p-3 rounded-md bg-card-bg border border-border/20 text-border"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <p className="text-xs uppercase text-muted mb-2">3. Grade</p>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full p-3 rounded-md bg-card-bg border border-border/20 text-border"
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase text-muted mb-2">Hold type</p>
          <select
            value={holdType}
            onChange={(e) => setHoldType(e.target.value as "jug" | "crimp" | "sloper")}
            className="w-full p-3 rounded-md bg-card-bg border border-border/20 text-border"
          >
            <option value="jug">Jug</option>
            <option value="crimp">Crimp</option>
            <option value="sloper">Sloper</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={!canCreate}
        className="w-full py-4 rounded-lg bg-primary text-border font-bold active:brightness-90 disabled:opacity-30"
      >
        Create project
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Lint and typecheck**

Run: `pnpm lint && npx tsc --noEmit`
Expected: passes (TanStack Router will regenerate `routeTree.gen.ts` when dev runs)

- [ ] **Step 3: Manually verify**

Run: `pnpm dev`. Navigate directly to `http://localhost:<port>/projects/new`. Take a photo, name it, pick a grade and hold type, hit Create. Expected: redirects to `/projects/<id>` (which 404s for now — that's fine, next task fixes it).

Verify in Convex dashboard that a new `projects` row exists.

- [ ] **Step 4: Commit**

```bash
git add src/routes/projects.new.tsx src/routeTree.gen.ts
git commit -m "feat(projects): add /projects/new route"
```

---

## Task 14: Project list route (`/projects`)

**Files:**
- Create: `src/routes/projects.tsx`

- [ ] **Step 1: Create the route**

```tsx
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Plus } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import { ProjectCard } from "../components/projects/project-card";

type Status = "active" | "sent";

export const Route = createFileRoute("/projects")({
  component: ProjectsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    status:
      search.status === "sent" || search.status === "active"
        ? (search.status as Status)
        : ("active" as const),
  }),
});

function ProjectsPage() {
  const { status } = Route.useSearch();
  const navigate = useNavigate();
  const projects = useQuery(api.projects.list, { status });

  const empty =
    status === "active"
      ? "No projects yet. Tap + to start one."
      : "Send your first project and it'll show up here.";

  return (
    <div className="px-4 pt-4 pb-8 font-display max-w-lg mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-border">Projects</h1>
        <Link
          to="/projects/new"
          className="w-10 h-10 rounded-full bg-primary text-border flex items-center justify-center active:brightness-90"
        >
          <Plus size={20} weight="bold" />
        </Link>
      </div>

      <div className="flex gap-2">
        {(["active", "sent"] as const).map((s) => {
          const sel = status === s;
          return (
            <button
              key={s}
              onClick={() => navigate({ to: "/projects", search: { status: s } })}
              className={`px-4 py-2 rounded-full text-sm font-display ${
                sel
                  ? "bg-primary text-border font-bold"
                  : "bg-card-bg text-border/70 border border-border/20"
              }`}
            >
              {s === "active" ? "Active" : "Sent"}
            </button>
          );
        })}
      </div>

      {projects === undefined ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-muted text-center mt-8">{empty}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map((p) => (
            <ProjectCard
              key={p._id}
              project={p}
              onClick={() =>
                navigate({ to: "/projects/$projectId", params: { projectId: p._id } })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Lint and typecheck**

Run: `pnpm lint && npx tsc --noEmit`
Expected: passes

- [ ] **Step 3: Manually verify**

Run: `pnpm dev`. Navigate to `http://localhost:<port>/projects`. Expected: empty state. Click `+`, create a project (from Task 13 flow). Return to `/projects`. Expected: card appears.

- [ ] **Step 4: Commit**

```bash
git add src/routes/projects.tsx src/routeTree.gen.ts
git commit -m "feat(projects): add /projects list route with active/sent subtabs"
```

---

## Task 15: Project detail route (`/projects/$projectId`)

**Files:**
- Create: `src/routes/projects.$projectId.tsx`

- [ ] **Step 1: Create the route**

```tsx
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { CaretLeft, DotsThree } from "@phosphor-icons/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { holdTypeConfig, type HoldType } from "../lib/grades";
import { ProjectCanvas } from "../components/projects/project-canvas";
import { MoveDetailSheet } from "../components/projects/move-detail-sheet";
import { AttemptButton } from "../components/projects/attempt-button";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const id = projectId as Id<"projects">;
  const project = useQuery(api.projects.get, { id });
  const moves = useQuery(api.projects.listMoves, { projectId: id });
  const allClimbs = useQuery(api.climbs.getAll);
  const renameProject = useMutation(api.projects.rename);
  const deleteProject = useMutation(api.projects.remove);

  const [selectedMove, setSelectedMove] = useState<Doc<"projectMoves"> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // All hooks must run before any early return — keep loading checks below this line.
  if (project === undefined || moves === undefined) {
    return <p className="p-4 text-sm text-muted">Loading…</p>;
  }
  if (project === null) {
    return <p className="p-4 text-sm text-muted">Project not found.</p>;
  }
  if (!project.photoUrl) {
    return <p className="p-4 text-sm text-muted">Photo unavailable.</p>;
  }

  const holdCfg = holdTypeConfig[project.holdType as HoldType];
  const movesDone = moves.filter((m) => m.state === "done").length;
  const attempts = (allClimbs ?? []).filter((c) => c.projectId === id).length;

  const handleRename = () => {
    const next = prompt("Rename project", project.name);
    if (next && next.trim() && next.trim() !== project.name) {
      renameProject({ id, name: next.trim() });
    }
    setMenuOpen(false);
  };

  const handleDelete = () => {
    if (confirm(`Delete "${project.name}"? This can't be undone.`)) {
      deleteProject({ id });
      navigate({ to: "/projects", search: { status: "active" } });
    }
    setMenuOpen(false);
  };

  return (
    <div className="px-4 pt-4 pb-8 font-display max-w-lg mx-auto flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate({ to: "/projects", search: { status: project.status } })}
          className="p-1 active:brightness-90"
        >
          <CaretLeft size={24} weight="bold" />
        </button>
        <h1 className="text-lg font-bold text-border truncate flex-1 text-center">
          {project.name}
        </h1>
        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="p-1 active:brightness-90">
            <DotsThree size={24} weight="bold" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 bg-card-bg border border-border/20 rounded-md shadow-md z-30 w-32">
              <button
                onClick={handleRename}
                className="block w-full text-left px-3 py-2 text-sm text-border hover:bg-neutral-bg"
              >
                Rename
              </button>
              <button
                onClick={handleDelete}
                className="block w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-neutral-bg"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span
          className="px-2 py-0.5 rounded-full text-xs font-bold text-border"
          style={{ backgroundColor: holdCfg?.color ?? "var(--color-primary)" }}
        >
          {project.grade}
        </span>
        <span className="text-muted">{holdCfg?.label}</span>
        {project.status === "sent" && (
          <span className="text-xs text-primary font-bold">✓ Sent</span>
        )}
      </div>

      <ProjectCanvas
        projectId={id}
        photoUrl={project.photoUrl}
        moves={moves}
        onMarkerTap={setSelectedMove}
      />

      <p className="text-sm text-muted text-center">
        {movesDone} / {moves.length} done · {attempts} attempts
      </p>

      <AttemptButton projectId={id} grade={project.grade} holdType={project.holdType} />

      <MoveDetailSheet move={selectedMove} onClose={() => setSelectedMove(null)} />
    </div>
  );
}
```

> **Note on attempt counting:** `api.climbs.getAll` returns the user's entire climb history; we filter client-side. For current data volumes this is fine, but if the history grows large, add a dedicated `climbs.countByProject` query. Flagged but not in scope.

- [ ] **Step 2: Lint and typecheck**

Run: `pnpm lint && npx tsc --noEmit`
Expected: passes

- [ ] **Step 3: Manually verify the full canvas flow**

Run: `pnpm dev`. Navigate to a project's detail page.

- Tap empty area on photo → marker appears, numbered 1
- Tap empty area again → second marker, numbered 2
- Tap a marker → bottom sheet opens
- Change state to "working" → marker turns blue dashed
- Add a vocab tag → chip selects, persists across sheet close/reopen
- Long-press a vocab chip → definition appears
- Type notes, blur → persists
- Close sheet, long-press a marker, drag → marker moves to new position
- Hit "+ attempt today" → attempt counter increments
- Cycle all moves to "done" → status flips to "sent", "✓ Sent" badge appears
- Navigate back to `/projects?status=sent` → project shows there
- Revert one move to "working" → status flips back to active
- Use the overflow menu to rename and to delete

- [ ] **Step 4: Commit**

```bash
git add src/routes/projects.$projectId.tsx src/routeTree.gen.ts
git commit -m "feat(projects): add /projects/\$projectId detail route"
```

---

## Task 16: Add Projects nav link

**Files:**
- Modify: `src/routes/__root.tsx`

- [ ] **Step 1: Add the import for Mountains icon**

In `src/routes/__root.tsx:3`, change:

```tsx
import { PencilSimple, CalendarDots, ChartBar, SignOut } from "@phosphor-icons/react";
```

to:

```tsx
import { PencilSimple, CalendarDots, ChartBar, SignOut, Mountains } from "@phosphor-icons/react";
```

- [ ] **Step 2: Add the desktop sidebar Projects link**

In `src/routes/__root.tsx`, between the existing Log link (ends ~line 24) and the Analytics link (starts ~line 25), insert:

```tsx
<Link
  to="/projects"
  search={{ status: "active" }}
  className="flex flex-col items-center p-2 rounded-lg text-sm"
  activeProps={{ className: "text-primary bg-primary/10" }}
  inactiveProps={{ className: "text-border/50 hover:text-border" }}
>
  <Mountains size={24} weight="bold" />
</Link>
```

- [ ] **Step 3: Add the mobile bottom-tab Projects link**

Between the existing mobile Log link and Analytics link, insert:

```tsx
<Link
  to="/projects"
  search={{ status: "active" }}
  className="flex-1 flex flex-col items-center py-2 text-sm"
  activeProps={{ className: "text-primary" }}
  inactiveProps={{ className: "text-border/50" }}
>
  <Mountains size={24} weight="bold" />
  <span>Projects</span>
</Link>
```

- [ ] **Step 4: Lint and typecheck**

Run: `pnpm lint && npx tsc --noEmit`
Expected: passes

- [ ] **Step 5: Manually verify**

Run: `pnpm dev`. Open the app at desktop and mobile widths.

- Desktop sidebar: Projects icon appears between Log and Analytics; clicking it navigates to `/projects?status=active`
- Mobile bottom tab bar: Projects tab appears with the Mountains icon and "Projects" label
- Tab highlights active state correctly when on `/projects` or `/projects/<id>`

- [ ] **Step 6: Commit**

```bash
git add src/routes/__root.tsx
git commit -m "feat(projects): add Projects nav link"
```

---

## Task 17: End-to-end smoke verification

This is a manual verification task — no code changes. Run through the full feature on a real device or device emulator (not just desktop browser) to confirm gestures work as expected.

- [ ] **Step 1: Start the app**

Run: `pnpm dev`. Open the URL on a phone or via Chrome DevTools mobile emulation.

- [ ] **Step 2: Run the smoke test checklist**

- Navigate to Projects tab via the bottom nav
- Empty state shows "No projects yet. Tap + to start one."
- Tap `+`, take or upload a photo of a wall
- Photo uploads (spinner, then thumbnail with Retake)
- Name the project, pick V5 + Crimp, tap Create
- Lands on detail page with the photo
- Tap 5 distinct holds → 5 numbered markers appear
- Tap marker 1, change state to "working" → marker turns blue dashed
- Add 2 vocab tags, type notes, close sheet
- Reopen marker 1 → state, vocab, notes all persisted
- Long-press a vocab chip → definition shows
- Long-press marker 3 and drag → marker moves on screen
- Tap "+ attempt today" 3 times → counter shows "3 attempts"
- Cycle all 5 moves to "done" → header shows "✓ Sent"
- Back to /projects → project disappears from Active list, shows in Sent
- Open the sent project, revert move 3 to "working" → status flips back to active
- Back to /projects → project back in Active list
- Overflow menu → rename → name updates everywhere
- Overflow menu → delete → confirm → returns to /projects, project gone

- [ ] **Step 3: Verify analytics still works**

Navigate to `/log` and `/analytics`. Existing functionality should be unchanged.

- [ ] **Step 4: Final lint and build**

Run: `pnpm lint`
Expected: passes

Run: `pnpm build`
Expected: passes

- [ ] **Step 5: Commit any final fixes**

If the smoke test surfaced bugs, fix them in scoped commits per the relevant task. Otherwise no commit needed.

---

## Out of scope

- Freehand sketch layer over the photo (deferred to v2 per spec)
- Arrows drawn between markers
- Photo replacement on existing project
- Face-blur / privacy tooling
- Multi-user / sharing
- Auto-attempt linking from log page
- Test infrastructure (no test runner exists; adding it is a separate spec)
- Undo toast on auto-send (the auto-revert when a move flips back to working is the recovery mechanism for this)
