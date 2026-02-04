import { query, mutation } from "./_generated/server";

// Generate daily standup
export const generate = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    const today = new Date(now);
    const yesterday = new Date(now - 24 * 60 * 60 * 1000);

    // Get all agents
    const agents = await ctx.db.query("agents").collect();

    // Get completed tasks in last 24h
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_created_at")
      .filter((q) => q.gte(q.field("createdAt"), yesterday.getTime()))
      .collect();

    const completedTasks = activities.filter((a) => a.type === "task_completed");
    const inProgress = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "in_progress"))
      .collect();

    const blocked = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "blocked"))
      .collect();

    const review = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "review"))
      .collect();

    // Build standup content
    const dateStr = today.toISOString().split("T")[0];
    let content = `# 📊 Daily Standup — ${dateStr}\n\n`;

    // Completed
    content += `## ✅ Completed Today\n\n`;
    if (completedTasks.length === 0) {
      content += `_No tasks completed in last 24h_\n\n`;
    } else {
      for (const activity of completedTasks.slice(0, 10)) {
        if (activity.taskId) {
          const task = await ctx.db.get(activity.taskId);
          if (task) {
            content += `- **${task.title}**\n`;
          }
        }
      }
      content += `\n`;
    }

    // In Progress
    content += `## 🔄 In Progress\n\n`;
    if (inProgress.length === 0) {
      content += `_No active tasks_\n\n`;
    } else {
      for (const task of inProgress) {
        content += `- **${task.title}**\n`;
        if (task.assigneeIds.length > 0) {
          const assignees = [];
          for (const aid of task.assigneeIds) {
            const agent = await ctx.db.get(aid);
            if (agent) assignees.push(agent.name);
          }
          content += `  - Assigned: ${assignees.join(", ")}\n`;
        }
      }
      content += `\n`;
    }

    // Blocked
    content += `## 🚫 Blocked\n\n`;
    if (blocked.length === 0) {
      content += `_No blocked tasks_\n\n`;
    } else {
      for (const task of blocked) {
        content += `- **${task.title}**\n`;
      }
      content += `\n`;
    }

    // Needs Review
    content += `## 👀 Needs Review\n\n`;
    if (review.length === 0) {
      content += `_Nothing waiting for review_\n\n`;
    } else {
      for (const task of review) {
        content += `- **${task.title}**\n`;
      }
      content += `\n`;
    }

    // Agent Status
    content += `## 🤖 Agent Status\n\n`;
    for (const agent of agents) {
      const statusEmoji =
        agent.status === "active"
          ? "🟢"
          : agent.status === "blocked"
          ? "🔴"
          : "⚪";
      content += `- ${statusEmoji} **${agent.name}**: ${agent.status}`;
      if (agent.currentTaskId) {
        const task = await ctx.db.get(agent.currentTaskId);
        if (task) {
          content += ` — working on "${task.title}"`;
        }
      }
      content += `\n`;
    }
    content += `\n`;

    // Key Decisions
    content += `## 📝 Key Decisions\n\n`;
    content += `_None recorded today_\n\n`;

    // Save as document
    const docId = await ctx.db.insert("documents", {
      title: `Daily Standup — ${dateStr}`,
      content,
      type: "standup",
      createdBy: "master",
      createdAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "standup_generated",
      message: `Daily standup generated for ${dateStr}`,
      createdAt: now,
    });

    return { docId, content };
  },
});

// Get latest standup
export const latest = query({
  handler: async (ctx) => {
    const standups = await ctx.db
      .query("documents")
      .withIndex("by_type", (q) => q.eq("type", "standup"))
      .order("desc")
      .take(1);

    return standups[0] || null;
  },
});
