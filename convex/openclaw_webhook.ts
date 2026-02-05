import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// HTTP action to receive OpenClaw webhook events
// This runs as a public HTTP endpoint
export const receiveEvent = mutation({
  args: {
    runId: v.string(),
    action: v.union(v.literal("start"), v.literal("end"), v.literal("error"), v.literal("progress")),
    sessionKey: v.string(),
    prompt: v.optional(v.string()),
    source: v.optional(v.string()),
    response: v.optional(v.string()),
    error: v.optional(v.string()),
    duration: v.optional(v.number()),
    toolsUsed: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { runId, action, sessionKey, prompt, source, response, error, duration, toolsUsed } = args;

    // Find agent by session key
    const agent = await findAgentBySession(ctx, sessionKey);
    
    // Get existing task for this run
    const existingTasks = await ctx.db
      .query("tasks")
      .filter((q: any) => q.eq(q.field("openclawRunId"), runId))
      .take(1);
    
    const existingTask = existingTasks[0];
    let taskId;

    switch (action) {
      case "start": {
        const title = prompt 
          ? `${source ? `[${source}] ` : ""}${prompt.substring(0, 80)}${prompt.length > 80 ? "..." : ""}`
          : `OpenClaw: ${runId.substring(0, 8)}`;

        taskId = await ctx.db.insert("tasks", {
          title,
          description: prompt || "OpenClaw agent session",
          status: "in_progress",
          priority: "medium",
          assigneeIds: agent ? [agent._id] : [],
          createdBy: agent?._id || "master",
          openclawRunId: runId,
          openclawSessionKey: sessionKey,
          openclawSource: source,
          tags: ["openclaw", source?.toLowerCase() || "cli"],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("activities", {
          type: "task_created",
          agentId: agent?._id,
          taskId,
          message: `🚀 OpenClaw started: ${title}`,
          metadata: { content: `Source: ${source || 'CLI'}` },
          createdAt: Date.now(),
        });
        break;
      }

      case "progress": {
        if (existingTask) {
          taskId = existingTask._id;
          const content = toolsUsed?.length 
            ? `**Tools:** ${toolsUsed.join(", ")}\n\n${response || ""}`
            : response || "Processing...";

          await ctx.db.insert("messages", {
            taskId,
            fromAgentId: agent?._id || "master",
            content,
            mentions: [],
            createdAt: Date.now(),
          });
        }
        break;
      }

      case "end": {
        if (existingTask) {
          taskId = existingTask._id;
          const durationStr = duration 
            ? `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`
            : "";

          await ctx.db.patch(taskId, {
            status: "review",
            updatedAt: Date.now(),
          });

          await ctx.db.insert("messages", {
            taskId,
            fromAgentId: agent?._id || "master",
            content: `✅ **Complete${durationStr ? ` (${durationStr})` : ""}**\n\n${response || ""}`,
            mentions: [],
            createdAt: Date.now(),
          });

          if (response) {
            await ctx.db.insert("documents", {
              title: `Output: ${existingTask.title}`,
              content: response,
              type: "deliverable",
              taskId,
              createdBy: agent?._id || "master",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          }

          await ctx.db.insert("activities", {
            type: "task_completed",
            agentId: agent?._id,
            taskId,
            message: `✅ OpenClaw complete: ${existingTask.title}`,
            metadata: { content: `Duration: ${duration || 0}ms` },
            createdAt: Date.now(),
          });
        }
        break;
      }

      case "error": {
        if (existingTask) {
          taskId = existingTask._id;
          
          await ctx.db.patch(taskId, {
            status: "blocked",
            updatedAt: Date.now(),
          });

          await ctx.db.insert("messages", {
            taskId,
            fromAgentId: agent?._id || "master",
            content: `❌ **Error**\n\n\`\`\`\n${error || "Unknown error"}\n\`\`\``,
            mentions: [],
            createdAt: Date.now(),
          });

          await ctx.db.insert("activities", {
            type: "task_updated",
            agentId: agent?._id,
            taskId,
            message: `❌ OpenClaw error: ${existingTask.title}`,
            metadata: { content: error || "Unknown" },
            createdAt: Date.now(),
          });
        }
        break;
      }
    }

    return { success: true, taskId, agentName: agent?.name };
  },
});

// Helper to find agent by session key
async function findAgentBySession(ctx: any, sessionKey: string) {
  // Check for existing mapping
  const mapping = await ctx.db
    .query("agentSessionMappings")
    .filter((q: any) => q.eq(q.field("openclawSessionKey"), sessionKey))
    .first();

  if (mapping) {
    return await ctx.db.get(mapping.agentId);
  }

  // Map session to agent
  const name = sessionKey.includes("vulture") ? "Vulture" :
               sessionKey.includes("scribe") ? "Scribe" :
               sessionKey.includes("horizon") ? "Horizon" : "Finn";

  const agent = await ctx.db
    .query("agents")
    .withIndex("by_name", (q: any) => q.eq("name", name))
    .first();

  if (agent) {
    await ctx.db.insert("agentSessionMappings", {
      openclawSessionKey: sessionKey,
      agentId: agent._id,
      createdAt: Date.now(),
    });
  }

  return agent;
}

// Get OpenClaw tasks
export const getOpenClawTasks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tasks")
      .filter((q: any) => q.neq(q.field("openclawRunId"), undefined))
      .order("desc")
      .take(50);
  },
});

// Stats
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db
      .query("tasks")
      .filter((q: any) => q.neq(q.field("openclawRunId"), undefined))
      .collect();

    return {
      total: tasks.length,
      active: tasks.filter((t: any) => t.status === "in_progress").length,
      completed: tasks.filter((t: any) => t.status === "review" || t.status === "done").length,
      errors: tasks.filter((t: any) => t.status === "blocked").length,
    };
  },
});
