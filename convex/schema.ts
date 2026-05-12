import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  climbs: defineTable({
    userId: v.string(),
    grade: v.string(),
    completed: v.boolean(),
    holdType: v.string(),
    climbedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "climbedAt"]),

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

  trainingSessions: defineTable({
    userId: v.string(),
    type: v.union(v.literal("fingerboard")),
    trainedAt: v.number(),
  }).index("by_user_date", ["userId", "trainedAt"]),
});
