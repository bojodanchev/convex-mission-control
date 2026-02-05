import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Webhook endpoint for OpenClaw events
export const receiveEvent = mutation({
  args: {
    runId: v.string(),
    action: v.union(v.literal("start"), v.literal("end"), v.literal("error"), v.literal("progress")),
    sessionKey: v.string(),
    prompt: v.optional(v.string()),
    source: v.optional(v.string()),
    response: v.optional(v.string()),
    error: v.optional(v.string()),
    duration: v.optional(v.number()), // in milliseconds
    toolsUsed: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { runId, action, sessionKey, prompt, source, response, error, duration, toolsUsed } = args;

    // Find or create the agent based on session key
    const agent = await findOrCreateAgentFromSession(ctx, sessionKey);

    // Check if we already have a task for this run
    const existingTask = await ctx.db
      .query("tasks")
      .filter((q: any) => q.eq(q.field("openclawRunId"), runId))
      .first();

    let taskId: Id<"tasks"> | undefined;

    if (action === "start") {
      // Create new task from OpenClaw run
      const title = prompt 
        ? `${source ? `[${source}] ` : ""}${prompt.substring(0, 80)}${prompt.length > 80 ? "..." : ""}`
        : `OpenClaw Session: ${runId.substring(0, 8)}`;

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
        tags: ["openclaw", source?.toLowerCase() || "unknown"],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Log activity
      await ctx.db.insert("activities", {
        type: "task_created",
        agentId: agent?._id,
        taskId,
        message: `🚀 OpenClaw started: ${title}`,
        metadata: { content: `runId: ${runId}, source: ${source || 'unknown'}` },
        createdAt: Date.now(),
      });

    } else if (existingTask) {
      taskId = existingTask._id;

      if (action === "progress") {
        // Add progress comment
        const progressContent = toolsUsed 
          ? `**Tools used:** ${toolsUsed.join(", ")}\n\n${response || ""}`
          : response || "Working...";

        await ctx.db.insert("messages", {
          taskId,
          fromAgentId: agent?._id || "master",
          content: progressContent,
          mentions: [],
          createdAt: Date.now(),
        });

      } else if (action === "end") {
        // Mark task complete
        const durationStr = duration 
          ? `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`
          : "unknown";

        await ctx.db.patch(taskId, {
          status: "review",
          updatedAt: Date.now(),
        });

        // Add completion comment
        await ctx.db.insert("messages", {
          taskId,
          fromAgentId: agent?._id || "master",
          content: `✅ **Completed in ${durationStr}**\n\n${response || "Task finished successfully."}`,
          mentions: [],
          createdAt: Date.now(),
        });

        // Create deliverable if response exists
        if (response) {
          await ctx.db.insert("documents", {
            title: `Deliverable: ${existingTask.title}`,
            content: response,
            type: "deliverable",
            taskId,
            createdBy: agent?._id || "master",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }

        // Log completion
        await ctx.db.insert("activities", {
          type: "task_completed",
          agentId: agent?._id,
          taskId,
          message: `✅ OpenClaw completed: ${existingTask.title} (${durationStr})`,
          metadata: { content: `runId: ${runId}, duration: ${duration || 0}ms` },
          createdAt: Date.now(),
        });

        // Notify command
        const command = await ctx.db
          .query("agents")
          .withIndex("by_name", (q: any) => q.eq("name", "Finn"))
          .first();

        if (command) {
          await ctx.db.insert("notifications", {
            mentionedAgentId: command._id,
            content: `✅ OpenClaw finished: ${existingTask.title}`,
            fromAgentId: agent?._id,
            taskId,
            delivered: false,
            createdAt: Date.now(),
          });
        }

      } else if (action === "error") {
        // Mark task blocked with error
        await ctx.db.patch(taskId, {
          status: "blocked",
          updatedAt: Date.now(),
        });

        // Add error comment
        await ctx.db.insert("messages", {
          taskId,
          fromAgentId: agent?._id || "master",
          content: `❌ **Error**\n\n${error || "Unknown error occurred"}`,
          mentions: [],
          createdAt: Date.now(),
        });

        // Log error
        await ctx.db.insert("activities", {
          type: "task_updated",
          agentId: agent?._id,
          taskId,
          message: `❌ OpenClaw error: ${existingTask.title}`,
          metadata: { content: `runId: ${runId}, error: ${error || 'unknown'}` },
          createdAt: Date.now(),
        });
      }
    }

    return { success: true, taskId, agentId: agent?._id };
  },
});

// Helper: Find or create agent from OpenClaw session
async function findOrCreateAgentFromSession(ctx: any, sessionKey: string) {
  // Try to find existing agent by session key mapping
  const existingMapping = await ctx.db
    .query("agentSessionMappings")
    .filter((q: any) => q.eq(q.field("openclawSessionKey"), sessionKey))
    .first();

  if (existingMapping) {
    return await ctx.db.get(existingMapping.agentId);
  }

  // Map session key to agent name
  let agentName = "Finn"; // Default to command

  if (sessionKey.includes("vulture")) agentName = "Vulture";
  else if (sessionKey.includes("scribe")) agentName = "Scribe";
  else if (sessionKey.includes("horizon")) agentName = "Horizon";
  else if (sessionKey.includes("finn")) agentName = "Finn";

  const agent = await ctx.db
    .query("agents")
    .withIndex("by_name", (q: any) => q.eq("name", agentName))
    .first();

  if (agent) {
    // Create mapping for future lookups
    await ctx.db.insert("agentSessionMappings", {
      openclawSessionKey: sessionKey,
      agentId: agent._id,
      createdAt: Date.now(),
    });
  }

  return agent;
}

// Get tasks with OpenClaw tracking
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

// Get stats for OpenClaw runs
export const getOpenClawStats = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db
      .query("tasks")
      .filter((q: any) => q.neq(q.field("openclawRunId"), undefined))
      .collect();

    const total = tasks.length;
    const completed = tasks.filter((t: any) => t.status === "review" || t.status === "done").length;
    const inProgress = tasks.filter((t: any) => t.status === "in_progress").length;
    const errors = tasks.filter((t: any) => t.status === "blocked").length;

    return { total, completed, inProgress, errors };
  },
});
