import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get system pause status
export const getPauseStatus = query({
  handler: async (ctx) => {
    const status = await ctx.db.query("systemStatus").first();
    return { paused: status?.paused || false };
  },
});

// Toggle system pause
export const togglePause = mutation({
  args: {
    paused: v.boolean(),
  },
  handler: async (ctx, { paused }) => {
    const existing = await ctx.db.query("systemStatus").first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        paused,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("systemStatus", {
        paused,
        updatedAt: Date.now(),
      });
    }
    
    // Log activity
    await ctx.db.insert("activities", {
      type: "agent_status_changed",
      message: paused ? "⏸️ System PAUSED — All agents on standby" : "▶️ System RESUMED — Agents active",
      metadata: { systemPaused: paused },
      createdAt: Date.now(),
    });
    
    return { paused };
  },
});

// Create a new task
export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"))
    ),
    assigneeIds: v.optional(v.array(v.id("agents"))),
    dueDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    requiredSkills: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      ...args,
      status: args.assigneeIds && args.assigneeIds.length > 0 ? "assigned" : "inbox",
      priority: args.priority || "medium",
      assigneeIds: args.assigneeIds || [],
      requiredSkills: args.requiredSkills || [],
      createdBy: "master",
      createdAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "task_created",
      taskId,
      message: `Task created: ${args.title}`,
      createdAt: now,
    });

    // Notify assignees
    if (args.assigneeIds) {
      for (const agentId of args.assigneeIds) {
        await ctx.db.insert("notifications", {
          mentionedAgentId: agentId,
          content: `📋 New task assigned: ${args.title}`,
          taskId,
          delivered: false,
          createdAt: now,
        });
      }
    }

    return taskId;
  },
});

// List all tasks
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("tasks").order("desc").take(100);
  },
});

// Get tasks grouped by status
export const byStatus = query({
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").order("desc").take(200);
    
    return {
      inbox: tasks.filter(t => t.status === "inbox"),
      assigned: tasks.filter(t => t.status === "assigned"),
      in_progress: tasks.filter(t => t.status === "in_progress"),
      review: tasks.filter(t => t.status === "review"),
      done: tasks.filter(t => t.status === "done"),
      blocked: tasks.filter(t => t.status === "blocked"),
      waiting: tasks.filter(t => t.status === "waiting"),
    };
  },
});

// Get single task
export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Update task
export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("inbox"), v.literal("assigned"), v.literal("in_progress"),
      v.literal("review"), v.literal("done"), v.literal("blocked"), v.literal("waiting")
    )),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"))),
    assigneeIds: v.optional(v.array(v.id("agents"))),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const task = await ctx.db.get(id);
    
    if (!task) {
      throw new Error("Task not found");
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    // Log activity if status changed
    if (updates.status && updates.status !== task.status) {
      await ctx.db.insert("activities", {
        type: "task_updated",
        taskId: id,
        message: `Task status changed: ${task.title} → ${updates.status}`,
        metadata: { oldStatus: task.status, newStatus: updates.status },
        createdAt: Date.now(),
      });
    }

    return id;
  },
});

// Delete task
export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return { success: true };
  },
});

// Filter tasks by status
export const byStatusFilter = query({
  args: {
    status: v.union(
      v.literal("inbox"), v.literal("assigned"), v.literal("in_progress"),
      v.literal("review"), v.literal("done"), v.literal("blocked"), v.literal("waiting")
    ),
  },
  handler: async (ctx, { status }) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", status))
      .order("desc")
      .take(50);
  },
});
