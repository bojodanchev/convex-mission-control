import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Agent claims a task from the inbox
export const claim = mutation({
  args: {
    taskId: v.id("tasks"),
    agentId: v.id("agents"),
  },
  handler: async (ctx, { taskId, agentId }) => {
    const task = await ctx.db.get(taskId);
    const agent = await ctx.db.get(agentId);
    
    if (!task || !agent) {
      throw new Error("Task or agent not found");
    }
    
    // Only inbox tasks can be claimed
    if (task.status !== "inbox") {
      throw new Error("Task is not in inbox");
    }
    
    // Check if agent has required skills (if specified)
    if (task.requiredSkills && task.requiredSkills.length > 0) {
      const hasRequiredSkills = task.requiredSkills.every(skill => 
        agent.skills?.includes(skill)
      );
      if (!hasRequiredSkills) {
        throw new Error("Agent lacks required skills for this task");
      }
    }
    
    // Update task
    await ctx.db.patch(taskId, {
      status: "assigned",
      assigneeIds: [agentId],
      claimedAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Update agent
    await ctx.db.patch(agentId, {
      status: "active",
      currentTaskId: taskId,
    });
    
    // Log activity
    await ctx.db.insert("activities", {
      type: "task_claimed",
      agentId,
      taskId,
      message: `${agent.name} claimed task: ${task.title}`,
      metadata: { oldStatus: "inbox", newStatus: "assigned" },
      createdAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Agent proposes a new task (auto-work-generation)
export const propose = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    proposedBy: v.id("agents"),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    requiredSkills: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { title, description, proposedBy, priority, requiredSkills, tags }) => {
    const agent = await ctx.db.get(proposedBy);
    
    if (!agent) {
      throw new Error("Agent not found");
    }
    
    if (!agent.canProposeTasks) {
      throw new Error("Agent is not authorized to propose tasks");
    }
    
    // Create task in inbox
    const taskId = await ctx.db.insert("tasks", {
      title,
      description,
      status: "inbox",
      assigneeIds: [],
      priority,
      createdBy: proposedBy,
      proposedBy,
      requiredSkills: requiredSkills || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: tags || [],
    });
    
    // Log activity
    await ctx.db.insert("activities", {
      type: "task_created",
      agentId: proposedBy,
      taskId,
      message: `${agent.name} proposed new task: ${title}`,
      metadata: { content: description },
      createdAt: Date.now(),
    });
    
    return { taskId };
  },
});

// Get inbox tasks (available for claiming)
export const getInbox = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "inbox"))
      .order("desc")
      .take(50);
    
    return tasks;
  },
});

// Get tasks proposed by a specific agent
export const getProposedBy = query({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, { agentId }) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_proposed_by", (q) => q.eq("proposedBy", agentId))
      .order("desc")
      .take(20);
    
    return tasks;
  },
});

// Update agent skills (for setup/initialization)
export const updateSkills = mutation({
  args: {
    agentId: v.id("agents"),
    skills: v.array(v.string()),
    canProposeTasks: v.optional(v.boolean()),
  },
  handler: async (ctx, { agentId, skills, canProposeTasks }) => {
    const update: { skills: string[]; canProposeTasks?: boolean } = { skills };
    if (canProposeTasks !== undefined) {
      update.canProposeTasks = canProposeTasks;
    }
    
    await ctx.db.patch(agentId, update);
    return { success: true };
  },
});
