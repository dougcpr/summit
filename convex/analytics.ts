import { query } from "./_generated/server";
import { v } from "convex/values";
import {
  computePyramid,
  computeHeatmapData,
  computeHoldTypeBreakdown,
  computeWeeklyZones,
  computeTimelineMilestones,
  computeHoldTypeTimelines,
  computeCoachNudges,
  computeWeeklyHighlights,
  computeTodayZone,
  getStartOfWeek,
} from "./analyticsHelpers";

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
    const cached = await readCache(ctx, userId, `pyramid:${args.goalGrade}`);
    if (cached.hit) return cached.value;

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
    const cached = await readCache(ctx, userId, "heatmapData");
    if (cached.hit) return cached.value;

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
    const cached = await readCache(ctx, userId, `holdTypeBreakdown:${args.goalGrade}`);
    if (cached.hit) return cached.value;

    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q: any) => q.eq("userId", userId).gte("climbedAt", ninetyDaysAgo))
      .collect();
    return computeHoldTypeBreakdown(climbs, args.goalGrade);
  },
});

// --- Weekly Training Zones ---

export const weeklyZones = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const cached = await readCache(ctx, userId, `weeklyZones:${args.goalGrade}`);
    if (cached.hit) {
      // Add todayZone at read time (not cached — depends on current day)
      const value = cached.value as { zones: unknown[] };
      return { ...value, todayZone: computeTodayZone() };
    }

    const weekStart = getStartOfWeek(new Date());
    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q: any) => q.eq("userId", userId).gte("climbedAt", weekStart.getTime()))
      .collect();
    const result = computeWeeklyZones(climbs, args.goalGrade);
    return { ...result, todayZone: computeTodayZone() };
  },
});

// --- Timeline Milestones ---

export const timelineMilestones = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const cached = await readCache(ctx, userId, `timelineMilestones:${args.goalGrade}`);
    if (cached.hit) {
      if (cached.value === null) return null;
      return { ...(cached.value as object), now: Date.now() };
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
    const cached = await readCache(ctx, userId, `holdTypeTimelines:${args.goalGrade}`);
    if (cached.hit) {
      if (cached.value === null) return null;
      return { ...(cached.value as object), now: Date.now() };
    }

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    const result = computeHoldTypeTimelines(climbs, args.goalGrade);
    return result ? { ...result, now: Date.now() } : null;
  },
});

// --- Coach Nudges ---

export const coachNudges = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const cached = await readCache(ctx, userId, `coachNudges:${args.goalGrade}`);
    if (cached.hit) return cached.value;

    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q: any) => q.eq("userId", userId).gte("climbedAt", ninetyDaysAgo))
      .collect();
    return computeCoachNudges(climbs, args.goalGrade);
  },
});

// --- Weekly Highlights ---

export const weeklyHighlights = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const cached = await readCache(ctx, userId, `weeklyHighlights:${args.goalGrade}`);
    if (cached.hit) return cached.value;

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    return computeWeeklyHighlights(climbs, args.goalGrade);
  },
});
