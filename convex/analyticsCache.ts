import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  computePyramid,
  computeHeatmapData,
  computeHoldTypeBreakdown,
  computeTimelineMilestones,
  computeHoldTypeTimelines,
  type ClimbDoc,
} from "./analyticsHelpers";

// Bump this when computation logic changes to invalidate stale caches.
export const CACHE_VERSION = 3;

async function upsertCache(
  ctx: { db: any },
  userId: string,
  queryKey: string,
  result: unknown,
) {
  const existing = await ctx.db
    .query("analyticsCache")
    .withIndex("by_user_key", (q: any) => q.eq("userId", userId).eq("queryKey", queryKey))
    .unique();

  const serialized = JSON.stringify(result);
  if (existing) {
    await ctx.db.patch(existing._id, { result: serialized, updatedAt: Date.now() });
  } else {
    await ctx.db.insert("analyticsCache", {
      userId,
      queryKey,
      result: serialized,
      updatedAt: Date.now(),
    });
  }
}

export async function getGoalGradeFromCache(ctx: { db: any }, userId: string): Promise<string> {
  const entries = await ctx.db
    .query("analyticsCache")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
  for (const entry of entries) {
    const match = entry.queryKey.match(/^v\d+:pyramid:(.+)$/);
    if (match) return match[1];
  }
  return "V5";
}

export const recompute = internalMutation({
  args: { userId: v.string(), goalGrade: v.string() },
  handler: async (ctx, args) => {
    const { userId, goalGrade } = args;

    // Clean up old-version or wrong-goalGrade cache entries
    const cv = CACHE_VERSION;
    const oldEntries = await ctx.db
      .query("analyticsCache")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    for (const entry of oldEntries) {
      const isCurrentVersion = entry.queryKey.startsWith(`v${cv}:`);
      const matchesGrade = entry.queryKey.endsWith(`:${goalGrade}`) || entry.queryKey === `v${cv}:heatmapData`;
      if (!isCurrentVersion || !matchesGrade) {
        await ctx.db.delete(entry._id);
      }
    }

    // Single fetch of all climbs
    const allClimbs: ClimbDoc[] = (
      await ctx.db
        .query("climbs")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .collect()
    ).map((c: any) => ({
      grade: c.grade,
      completed: c.completed,
      holdType: c.holdType,
      climbedAt: c.climbedAt,
    }));

    // Time-filtered subsets
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const recentClimbs = allClimbs.filter((c) => c.climbedAt >= ninetyDaysAgo);

    // Compute all analytics from the single fetch
    await upsertCache(ctx, userId, `v${cv}:pyramid:${goalGrade}`, computePyramid(allClimbs, goalGrade));
    await upsertCache(ctx, userId, `v${cv}:heatmapData`, computeHeatmapData(allClimbs));
    await upsertCache(ctx, userId, `v${cv}:holdTypeBreakdown:${goalGrade}`, computeHoldTypeBreakdown(recentClimbs, goalGrade));
    await upsertCache(ctx, userId, `v${cv}:timelineMilestones:${goalGrade}`, computeTimelineMilestones(allClimbs, goalGrade));
    await upsertCache(ctx, userId, `v${cv}:holdTypeTimelines:${goalGrade}`, computeHoldTypeTimelines(allClimbs, goalGrade));
  },
});

// Public mutation: frontend calls this on analytics page load to ensure cache exists
export const ensureCache = mutation({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.tokenIdentifier;

    // Check if cache exists for this specific goalGrade and version
    const existing = await ctx.db
      .query("analyticsCache")
      .withIndex("by_user_key", (q) =>
        q.eq("userId", userId).eq("queryKey", `v${CACHE_VERSION}:pyramid:${args.goalGrade}`),
      )
      .unique();

    if (!existing) {
      // No cache for this goalGrade — schedule recomputation
      await ctx.scheduler.runAfter(0, internal.analyticsCache.recompute, {
        userId,
        goalGrade: args.goalGrade,
      });
    }
  },
});
