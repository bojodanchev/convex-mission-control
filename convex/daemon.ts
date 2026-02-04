import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all undelivered notifications across all agents
export const getUndelivered = query({
  handler: async (ctx) => {
    // Get all agents first
    const agents = await ctx.db.query("agents").collect();
    const allNotifications = [];
    
    // For each agent, get their undelivered notifications
    for (const agent of agents) {
      const notifications = await ctx.db
        .query("notifications")
        .withIndex("by_delivered", (q) =>
          q.eq("mentionedAgentId", agent._id).eq("delivered", false)
        )
        .collect();
      allNotifications.push(...notifications);
    }
    
    return allNotifications;
  },
});

// Get undelivered notifications for a specific agent
export const getUndeliveredForAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_delivered", (q) =>
        q.eq("mentionedAgentId", agentId).eq("delivered", false)
      )
      .order("asc")
      .collect();
  },
});

// Mark multiple notifications as delivered
export const markManyDelivered = mutation({
  args: { notificationIds: v.array(v.id("notifications")) },
  handler: async (ctx, { notificationIds }) => {
    for (const id of notificationIds) {
      await ctx.db.patch(id, {
        delivered: true,
        deliveredAt: Date.now(),
      });
    }
    return { count: notificationIds.length };
  },
});

// Get all agents with their session keys
export const getAgentSessions = query({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    return agents.map(a => ({
      id: a._id,
      name: a.name,
      sessionKey: a.sessionKey,
    }));
  },
});
