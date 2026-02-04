import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

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
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      ...args,
      status: args.assigneeIds && args.assigneeIds.length > 0 ? "assigned" : "inbox",
      priority: args.priority || "medium",
      assigneeIds: args.assigneeIds || [],
      createdBy: "master", // Or could be agent ID
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
          content: `New task assigned: ${args.title}`,
          taskId,
          delivered: false,
          createdAt: now,
        });

        // Auto-subscribe to task
        await ctx.db.insert("subscriptions", {
          agentId,
          taskId,
          subscribedAt: now,
        });
      }
    }

    return taskId;
  },
});

// Get all tasks
export const list = query({
  args: {
    status: v.optional(v.string()),
    assigneeId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const status = args.status;
    const assigneeId = args.assigneeId;

    if (status) {
      return await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", status as any))
        .order("desc")
        .collect();
    } else if (assigneeId) {
      return await ctx.db
        .query("tasks")
        .withIndex("by_assignee", (q) => q.eq("assigneeIds", [assigneeId]))
        .order("desc")
        .collect();
    }

    return await ctx.db.query("tasks").order("desc").collect();
  },
});

// Get task by ID with details
export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const task = await ctx.db.get(id);
    if (!task) return null;

    // Get assignee details
    const assignees = [];
    for (const agentId of task.assigneeIds) {
      const agent = await ctx.db.get(agentId);
      if (agent) assignees.push(agent);
    }

    // Get recent messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_task", (q) => q.eq("taskId", id))
      .order("desc")
      .take(20);

    // Get attached documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_task", (q) => q.eq("taskId", id))
      .order("desc")
      .collect();

    return { ...task, assignees, messages, documents };
  },
});

// Update task
export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("inbox"),
        v.literal("assigned"),
        v.literal("in_progress"),
        v.literal("review"),
        v.literal("done"),
        v.literal("blocked")
      )
    ),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"))
    ),
    assigneeIds: v.optional(v.array(v.id("agents"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const task = await ctx.db.get(id);
    if (!task) return { error: "Task not found" };

    const oldStatus = task.status;
    const now = Date.now();

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "task_updated",
      taskId: id,
      message: updates.status
        ? `Task moved from ${oldStatus} to ${updates.status}`
        : `Task updated: ${task.title}`,
      metadata: { oldStatus, newStatus: updates.status },
      createdAt: now,
    });

    // If completed, log special activity
    if (updates.status === "done" && oldStatus !== "done") {
      await ctx.db.insert("activities", {
        type: "task_completed",
        taskId: id,
        message: `Task completed: ${task.title}`,
        createdAt: now,
      });
    }

    // Notify subscribers
    const subscribers = await ctx.db
      .query("subscriptions")
      .withIndex("by_task", (q) => q.eq("taskId", id))
      .collect();

    for (const sub of subscribers) {
      await ctx.db.insert("notifications", {
        mentionedAgentId: sub.agentId,
        content: `Task "${task.title}" updated${updates.status ? ` → ${updates.status}` : ""}`,
        taskId: id,
        delivered: false,
        createdAt: now,
      });
    }

    return { success: true };
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

// Get tasks by status (for Kanban board)
export const byStatus = query({
  handler: async (ctx) => {
    const allTasks = await ctx.db.query("tasks").order("desc").collect();
    
    const grouped = {
      inbox: [] as typeof allTasks,
      assigned: [] as typeof allTasks,
      in_progress: [] as typeof allTasks,
      review: [] as typeof allTasks,
      done: [] as typeof allTasks,
      blocked: [] as typeof allTasks,
    };

    for (const task of allTasks) {
      grouped[task.status].push(task);
    }

    return grouped;
  },
});
