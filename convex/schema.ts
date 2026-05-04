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
