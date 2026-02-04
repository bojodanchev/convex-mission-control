import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Initialize agents on first run
export const init = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("agents").collect();
    if (existing.length > 0) {
      return { status: "already_initialized", count: existing.length };
    }

    // Create the 3-agent squad
    const agents = [
      {
        name: "Vulture",
        role: "Code Review Agent",
        status: "idle" as const,
        sessionKey: "agent:vulture:main",
        personality: "Ruthless but fair security reviewer",
        specialty: ["Security audits", "PR reviews", "Style checks"],
      },
      {
        name: "Scribe",
        role: "Documentation Agent",
        status: "idle" as const,
        sessionKey: "agent:scribe:main",
        personality: "Obsessively organized knowledge keeper",
        specialty: ["SOP maintenance", "Learnings extraction", "Wiki sync"],
      },
      {
        name: "Horizon",
        role: "Research Agent",
        status: "idle" as const,
        sessionKey: "agent:horizon:main",
        personality: "Always scanning the horizon for threats and opportunities",
        specialty: ["Fintech news", "Regulations", "Competitor monitoring"],
      },
    ];

    for (const agent of agents) {
      await ctx.db.insert("agents", agent);
    }

    return { status: "initialized", count: agents.length };
  },
});

// Get all agents
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("agents").collect();
  },
});

// Get agent by name
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
  },
});

// Get agent by session key
export const getBySessionKey = query({
  args: { sessionKey: v.string() },
  handler: async (ctx, { sessionKey }) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_session_key", (q) => q.eq("sessionKey", sessionKey))
      .first();
  },
});

// Update agent status
export const updateStatus = mutation({
  args: {
    agentId: v.id("agents"),
    status: v.union(
      v.literal("idle"),
      v.literal("active"),
      v.literal("blocked")
    ),
    currentTaskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, { agentId, status, currentTaskId }) => {
    await ctx.db.patch(agentId, {
      status,
      currentTaskId,
      lastHeartbeatAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "agent_status_changed",
      agentId,
      message: `Agent status changed to ${status}`,
      metadata: { newStatus: status },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Agent heartbeat
export const heartbeat = mutation({
  args: { agentName: v.string() },
  handler: async (ctx, { agentName }) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", agentName))
      .first();

    if (!agent) {
      return { error: "Agent not found" };
    }

    await ctx.db.patch(agent._id, {
      lastHeartbeatAt: Date.now(),
    });

    // Log heartbeat activity
    await ctx.db.insert("activities", {
      type: "agent_heartbeat",
      agentId: agent._id,
      message: `${agentName} heartbeat`,
      createdAt: Date.now(),
    });

    return { success: true, agentId: agent._id };
  },
});

// Get agent with current task details
export const getWithTask = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) return null;

    let currentTask = null;
    if (agent.currentTaskId) {
      currentTask = await ctx.db.get(agent.currentTaskId);
    }

    return { ...agent, currentTask };
  },
});
