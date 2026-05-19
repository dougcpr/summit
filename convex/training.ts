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
      .query("trainingSessions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("trainedAt", args.startTime).lt("trainedAt", args.endTime),
      )
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    type: v.union(v.literal("fingerboard"), v.literal("strength")),
    trainedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    return await ctx.db.insert("trainingSessions", { ...args, userId });
  },
});

export const remove = mutation({
  args: { id: v.id("trainingSessions") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
