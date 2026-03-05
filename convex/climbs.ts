import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByDate = query({
  args: {
    userId: v.string(),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).gte("climbedAt", args.startTime).lt("climbedAt", args.endTime),
      )
      .order("desc")
      .collect();
  },
});

export const getAll = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("climbs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    userId: v.string(),
    grade: v.string(),
    completed: v.boolean(),
    holdType: v.string(),
    climbedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("climbs", args);
  },
});

export const remove = mutation({
  args: { id: v.id("climbs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
