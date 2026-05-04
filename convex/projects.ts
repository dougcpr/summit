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

    const moves = await ctx.db
      .query("projectMoves")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    for (const m of moves) await ctx.db.delete(m._id);

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    for (const c of climbs) await ctx.db.patch(c._id, { projectId: undefined });

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
