import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Update agent session key
export const updateSessionKey = mutation({
  args: {
    agentId: v.id("agents"),
    sessionKey: v.string(),
  },
  handler: async (ctx, { agentId, sessionKey }) => {
    await ctx.db.patch(agentId, { sessionKey });
    return { success: true };
  },
});

// Update all agents with their OpenClaw session keys
export const updateAllSessionKeys = mutation({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    
    const sessionKeys: Record<string, string> = {
      "Vulture": "agent:main:subagent:e140b5bb-630d-4416-b341-1f7f7760a519",
      "Scribe": "agent:main:subagent:950e3ef4-fb76-4eaf-8c93-023994c32553",
      "Horizon": "agent:main:subagent:90d1cca0-1939-43b8-a9a9b-255df23c7ae6",
    };
    
    for (const agent of agents) {
      if (sessionKeys[agent.name]) {
        await ctx.db.patch(agent._id, { sessionKey: sessionKeys[agent.name] });
      }
    }
    
    return { updated: agents.length };
  },
});
