import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByDate = query({
  args: {
    userId: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notes")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    userId: v.string(),
    content: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { content: args.content });
    } else {
      await ctx.db.insert("notes", args);
    }
  },
});
