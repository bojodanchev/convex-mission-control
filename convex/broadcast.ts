import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Broadcast a message to all agents or specific agents
export const send = mutation({
  args: {
    content: v.string(),
    targetAgents: v.optional(v.array(v.id("agents"))), // null = broadcast to all
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("urgent"))),
    category: v.optional(v.string()), // e.g., "announcement", "alert", "update"
  },
  handler: async (ctx, args) => {
    const { content, targetAgents, priority = "normal", category = "announcement" } = args;
    const now = Date.now();
    
    // Get target agents
    let agentsToNotify;
    if (targetAgents && targetAgents.length > 0) {
      agentsToNotify = [];
      for (const agentId of targetAgents) {
        const agent = await ctx.db.get(agentId);
        if (agent) agentsToNotify.push(agent);
      }
    } else {
      // Broadcast to all agents
      agentsToNotify = await ctx.db.query("agents").collect();
    }

    const notifications = [];
    
    // Create notifications for each agent
    for (const agent of agentsToNotify) {
      const notifId = await ctx.db.insert("notifications", {
        mentionedAgentId: agent._id,
        content: `[${category.toUpperCase()}] ${content}`,
        fromAgentId: undefined, // From Command/system
        delivered: false,
        createdAt: now,
      });
      notifications.push({ agentId: agent._id, agentName: agent.name, notifId });
    }

    // Log the broadcast as an activity
    await ctx.db.insert("activities", {
      type: "mention",
      message: `📢 Broadcast: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
      metadata: { 
        content: `Broadcast to ${agentsToNotify.length} agents: ${content.substring(0, 200)}`,
      },
      createdAt: now,
    });

    // Create a broadcast document for the archive
    const broadcastDocId = await ctx.db.insert("documents", {
      title: `Broadcast: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
      content: `# Broadcast Message\n\n**Priority:** ${priority}\n**Category:** ${category}\n**Time:** ${new Date(now).toISOString()}\n\n---\n\n${content}\n\n---\n\n**Recipients:** ${agentsToNotify.map(a => a.name).join(", ")}`,
      type: "note",
      createdBy: "master",
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      recipientCount: agentsToNotify.length,
      notifications: notifications.map(n => ({ agentName: n.agentName, notifId: n.notifId })),
      broadcastDocId,
    };
  },
});

// Get recent broadcasts (from documents with broadcast content)
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    const broadcasts = await ctx.db
      .query("documents")
      .withIndex("by_created_at")
      .order("desc")
      .filter((q) => q.eq(q.field("createdBy"), "master"))
      .take(limit);
    
    return broadcasts;
  },
});

// Get broadcast stats
export const getStats = query({
  handler: async (ctx) => {
    const totalAgents = await ctx.db.query("agents").collect();
    
    // Get all notifications and filter for undelivered
    const allNotifications = await ctx.db.query("notifications").collect();
    const undeliveredNotifications = allNotifications.filter(n => !n.delivered);
    
    return {
      totalAgents: totalAgents.length,
      pendingBroadcasts: undeliveredNotifications.length,
      activeAgents: totalAgents.filter(a => a.status === "active").length,
    };
  },
});
