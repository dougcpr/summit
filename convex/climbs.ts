import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function getUserId(ctx: {
  auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.tokenIdentifier;
}

export const getByDate = query({
  args: {
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    return await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("climbedAt", args.startTime).lt("climbedAt", args.endTime),
      )
      .order("desc")
      .collect();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    return await ctx.db
      .query("climbs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    grade: v.string(),
    completed: v.boolean(),
    holdType: v.string(),
    climbedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    return await ctx.db.insert("climbs", { ...args, userId });
  },
});

export const remove = mutation({
  args: { id: v.id("climbs") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const climb = await ctx.db.get(args.id);
    if (!climb || climb.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
