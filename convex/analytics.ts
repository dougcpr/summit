import { query } from "./_generated/server";
import { v } from "convex/values";
import {
  computePyramid,
  computeHeatmapData,
  computeHoldTypeBreakdown,
  computeTimelineMilestones,
  computeHoldTypeTimelines,
} from "./analyticsHelpers";
import { CACHE_VERSION } from "./analyticsCache";

async function getUserId(ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.tokenIdentifier;
}

// Returns { hit: true, value } on cache hit (value may be null for queries that return null),
// or { hit: false } on cache miss. This distinguishes "cached null" from "no cache entry".
async function readCache(ctx: { db: any }, userId: string, queryKey: string): Promise<{ hit: true; value: unknown } | { hit: false }> {
  const entry = await ctx.db
    .query("analyticsCache")
    .withIndex("by_user_key", (q: any) => q.eq("userId", userId).eq("queryKey", queryKey))
    .unique();
  if (entry) return { hit: true, value: JSON.parse(entry.result) };
  return { hit: false };
}

// --- Pyramid ---

export const pyramid = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const cached = await readCache(ctx, userId, `v${CACHE_VERSION}:pyramid:${args.goalGrade}`);
    if (cached.hit) return cached.value as ReturnType<typeof computePyramid>;

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    return computePyramid(climbs, args.goalGrade);
  },
});

// --- Heatmap Data ---

export const heatmapData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const cached = await readCache(ctx, userId, `v${CACHE_VERSION}:heatmapData`);
    if (cached.hit) return cached.value as ReturnType<typeof computeHeatmapData>;

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    return computeHeatmapData(climbs);
  },
});

// --- Hold Type Breakdown (last 90 days) ---

export const holdTypeBreakdown = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const cached = await readCache(ctx, userId, `v${CACHE_VERSION}:holdTypeBreakdown:${args.goalGrade}`);
    if (cached.hit) return cached.value as ReturnType<typeof computeHoldTypeBreakdown>;

    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q: any) => q.eq("userId", userId).gte("climbedAt", ninetyDaysAgo))
      .collect();
    return computeHoldTypeBreakdown(climbs, args.goalGrade);
  },
});

// --- Timeline Milestones ---

export const timelineMilestones = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const cached = await readCache(ctx, userId, `v${CACHE_VERSION}:timelineMilestones:${args.goalGrade}`);
    if (cached.hit) {
      if (cached.value === null) return null;
      const v = cached.value as NonNullable<ReturnType<typeof computeTimelineMilestones>>;
      return { ...v, now: Date.now() };
    }

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    const result = computeTimelineMilestones(climbs, args.goalGrade);
    return result ? { ...result, now: Date.now() } : null;
  },
});

// --- Hold Type Timelines ---

export const holdTypeTimelines = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const cached = await readCache(ctx, userId, `v${CACHE_VERSION}:holdTypeTimelines:${args.goalGrade}`);
    if (cached.hit) {
      if (cached.value === null) return null;
      const v = cached.value as NonNullable<ReturnType<typeof computeHoldTypeTimelines>>;
      return { ...v, now: Date.now() };
    }

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    const result = computeHoldTypeTimelines(climbs, args.goalGrade);
    return result ? { ...result, now: Date.now() } : null;
  },
});

// --- Training Sessions By Date (for Year Calendar) ---

export const trainingByDate = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const sessions = await ctx.db
      .query("trainingSessions")
      .withIndex("by_user_date", (q: any) => q.eq("userId", userId))
      .collect();

    const byDate: Record<string, { count: number; hasFingerboard: boolean; hasStrength: boolean }> = {};
    for (const s of sessions) {
      const d = new Date(s.trainedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const entry = byDate[key] ?? { count: 0, hasFingerboard: false, hasStrength: false };
      entry.count++;
      if (s.type === "fingerboard") entry.hasFingerboard = true;
      if (s.type === "strength") entry.hasStrength = true;
      byDate[key] = entry;
    }

    return Object.entries(byDate).map(([date, info]) => ({
      date,
      count: info.count,
      hasFingerboard: info.hasFingerboard,
      hasStrength: info.hasStrength,
    }));
  },
});

