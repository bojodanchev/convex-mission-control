import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Create a message/comment
export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    content: v.string(),
    mentions: v.optional(v.array(v.id("agents"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get agent from session or default to master
    // In practice, you'd identify which agent is calling
    const fromAgentId: any = "master"; // Or detect from auth

    const messageId = await ctx.db.insert("messages", {
      taskId: args.taskId,
      fromAgentId,
      content: args.content,
      mentions: args.mentions || [],
      createdAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "message_sent",
      taskId: args.taskId,
      message: `New comment on task`,
      createdAt: now,
    });

    // Create notifications for @mentions
    if (args.mentions) {
      for (const agentId of args.mentions) {
        await ctx.db.insert("notifications", {
          mentionedAgentId: agentId,
          content: `You were mentioned: ${args.content.substring(0, 100)}...`,
          fromAgentId: fromAgentId !== "master" ? fromAgentId : undefined,
          taskId: args.taskId,
          messageId,
          delivered: false,
          createdAt: now,
        });
      }
    }

    // Auto-subscribe commenter to thread
    if (fromAgentId !== "master") {
      const existing = await ctx.db
        .query("subscriptions")
        .withIndex("by_agent_task", (q) =>
          q.eq("agentId", fromAgentId).eq("taskId", args.taskId)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("subscriptions", {
          agentId: fromAgentId,
          taskId: args.taskId,
          subscribedAt: now,
        });
      }
    }

    // Notify all subscribers (except the author)
    const subscribers = await ctx.db
      .query("subscriptions")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    for (const sub of subscribers) {
      if (sub.agentId !== fromAgentId) {
        await ctx.db.insert("notifications", {
          mentionedAgentId: sub.agentId,
          content: `New reply on subscribed task`,
          taskId: args.taskId,
          messageId,
          delivered: false,
          createdAt: now,
        });
      }
    }

    return messageId;
  },
});

// Get messages for a task
export const byTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .order("asc")
      .collect();

    // Enrich with agent info
    const enriched = [];
    for (const msg of messages) {
      let fromAgent = null;
      if (msg.fromAgentId !== "master") {
        fromAgent = await ctx.db.get(msg.fromAgentId);
      }
      enriched.push({
        ...msg,
        fromAgentName: fromAgent?.name || "Master",
        fromAgentRole: fromAgent?.role || "Human",
      });
    }

    return enriched;
  },
});

// Get recent messages across all tasks
export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_created_at")
      .order("desc")
      .take(limit);
  },
});
