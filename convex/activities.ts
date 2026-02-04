import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get activity feed
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 50 }) => {
    let q = ctx.db.query("activities").withIndex("by_created_at").order("desc");

    if (limit) {
      return await q.take(limit);
    }

    return await q.collect();
  },
});

// Get activities for a specific agent
export const byAgent = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { agentId, limit = 20 }) => {
    return await ctx.db
      .query("activities")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .order("desc")
      .take(limit);
  },
});

// Get activities for a specific task
export const byTask = query({
  args: {
    taskId: v.id("tasks"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { taskId, limit = 50 }) => {
    return await ctx.db
      .query("activities")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .order("desc")
      .take(limit);
  },
});

// Log an activity (for internal use by other mutations)
export const log = mutation({
  args: {
    type: v.union(
      v.literal("task_created"),
      v.literal("task_updated"),
      v.literal("task_completed"),
      v.literal("message_sent"),
      v.literal("document_created"),
      v.literal("document_updated"),
      v.literal("agent_heartbeat"),
      v.literal("agent_status_changed"),
      v.literal("mention"),
      v.literal("standup_generated")
    ),
    agentId: v.optional(v.id("agents")),
    taskId: v.optional(v.id("tasks")),
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activities", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
