import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Update agent to reflect assigned tasks
export const syncTaskAssignments = mutation({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const tasks = await ctx.db.query("tasks").collect();
    
    const updates = [];
    
    for (const agent of agents) {
      // Find tasks assigned to this agent
      const assignedTasks = tasks.filter(t => 
        t.assigneeIds.includes(agent._id) && 
        (t.status === "assigned" || t.status === "in_progress")
      );
      
      if (assignedTasks.length > 0 && agent.status === "idle") {
        // Update agent to active with current task
        await ctx.db.patch(agent._id, {
          status: "active",
          currentTaskId: assignedTasks[0]._id,
        });
        
        updates.push({
          agent: agent.name,
          status: "active",
          task: assignedTasks[0].title,
        });
      }
    }
    
    return { updates };
  },
});

// Mark a task as in_progress when agent starts working
export const startTask = mutation({
  args: {
    taskId: v.id("tasks"),
    agentId: v.id("agents"),
  },
  handler: async (ctx, { taskId, agentId }) => {
    // Update task status
    await ctx.db.patch(taskId, {
      status: "in_progress",
      updatedAt: Date.now(),
    });
    
    // Update agent
    await ctx.db.patch(agentId, {
      status: "active",
      currentTaskId: taskId,
    });
    
    // Log activity
    const task = await ctx.db.get(taskId);
    const agent = await ctx.db.get(agentId);
    
    await ctx.db.insert("activities", {
      type: "task_updated",
      agentId,
      taskId,
      message: `${agent?.name || "Agent"} started working on: ${task?.title || "task"}`,
      metadata: { oldStatus: "assigned", newStatus: "in_progress" },
      createdAt: Date.now(),
    });
    
    return { success: true };
  },
});
