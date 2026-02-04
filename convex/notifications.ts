import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get undelivered notifications for an agent
export const undelivered = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_delivered", (q) =>
        q.eq("mentionedAgentId", agentId).eq("delivered", false)
      )
      .order("desc")
      .collect();
  },
});

// Get all notifications for an agent
export const list = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { agentId, limit = 50 }) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_agent", (q) => q.eq("mentionedAgentId", agentId))
      .order("desc")
      .take(limit);
  },
});

// Mark notification as delivered
export const markDelivered = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    await ctx.db.patch(notificationId, {
      delivered: true,
      deliveredAt: Date.now(),
    });
    return { success: true };
  },
});

// Mark all as delivered for an agent
export const markAllDelivered = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const undelivered = await ctx.db
      .query("notifications")
      .withIndex("by_delivered", (q) =>
        q.eq("mentionedAgentId", agentId).eq("delivered", false)
      )
      .collect();

    for (const notif of undelivered) {
      await ctx.db.patch(notif._id, {
        delivered: true,
        deliveredAt: Date.now(),
      });
    }

    return { count: undelivered.length };
  },
});

// Create notification (internal use)
export const create = mutation({
  args: {
    mentionedAgentId: v.id("agents"),
    content: v.string(),
    fromAgentId: v.optional(v.id("agents")),
    taskId: v.optional(v.id("tasks")),
    messageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      ...args,
      delivered: false,
      createdAt: Date.now(),
    });
  },
});
