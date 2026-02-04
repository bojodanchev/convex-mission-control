import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Create Command (human operator)
export const createCommand = mutation({
  args: {
    name: v.string(),
    telegramId: v.optional(v.string()),
  },
  handler: async (ctx, { name, telegramId }) => {
    // Check if command already exists
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    
    if (existing) {
      return { id: existing._id, status: "already_exists" };
    }

    const id = await ctx.db.insert("agents", {
      name,
      role: "Command Center / Human Operator",
      status: "active",
      sessionKey: "human:command:main",
      personality: "The orchestrator. Creates missions, reviews deliverables, makes strategic decisions.",
      specialty: ["Strategic oversight", "Task assignment", "Final approval", "Delegation"],
      currentTaskId: undefined,
      lastHeartbeatAt: Date.now(),
    });

    return { id, status: "created" };
  },
});

// Get Command user
export const getCommand = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", "Finn"))
      .first();
  },
});

// Initialize the full system
export const initializeSystem = mutation({
  handler: async (ctx) => {
    const results = {
      command: null as any,
      sampleTasks: [] as any[],
      activities: [] as any[],
    };

    // 1. Create Command (Finn)
    const command = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", "Finn"))
      .first();

    if (!command) {
      results.command = await ctx.db.insert("agents", {
        name: "Finn",
        role: "Command Center / Human Operator",
        status: "active",
        sessionKey: "human:command:main",
        personality: "The orchestrator. Creates missions, reviews deliverables, makes strategic decisions. Delegates to Vulture, Scribe, and Horizon.",
        specialty: ["Strategic oversight", "Task assignment", "Final approval", "Mission planning"],
        lastHeartbeatAt: Date.now(),
      });
    } else {
      results.command = command._id;
    }

    // 2. Get agent IDs
    const agents = await ctx.db.query("agents").collect();
    const vulture = agents.find(a => a.name === "Vulture");
    const scribe = agents.find(a => a.name === "Scribe");
    const horizon = agents.find(a => a.name === "Horizon");

    // 3. Create sample tasks if none exist
    const existingTasks = await ctx.db.query("tasks").collect();
    
    if (existingTasks.length === 0) {
      // Task 1: Security audit (for Vulture)
      if (vulture) {
        const task1 = await ctx.db.insert("tasks", {
          title: "🔒 Security Audit: Authentication Flow",
          description: "Review the current authentication implementation for OWASP Top 10 vulnerabilities. Focus on: session management, password policies, MFA implementation. Document findings with specific line references.",
          status: "assigned",
          priority: "high",
          assigneeIds: [vulture._id],
          createdBy: results.command,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: ["security", "audit", "auth"],
        });
        results.sampleTasks.push(task1);

        // Add message
        await ctx.db.insert("messages", {
          taskId: task1,
          fromAgentId: results.command,
          content: "@Vulture Please prioritize this audit. We need to ensure PCI DSS compliance before next release.",
          mentions: [vulture._id],
          createdAt: Date.now(),
        });

        // Create notification
        await ctx.db.insert("notifications", {
          mentionedAgentId: vulture._id,
          content: "🔒 New security audit task assigned by Finn",
          fromAgentId: results.command,
          taskId: task1,
          delivered: false,
          createdAt: Date.now(),
        });

        // Subscribe Vulture to task
        await ctx.db.insert("subscriptions", {
          agentId: vulture._id,
          taskId: task1,
          subscribedAt: Date.now(),
        });
      }

      // Task 2: Documentation review (for Scribe)
      if (scribe) {
        const task2 = await ctx.db.insert("tasks", {
          title: "📝 Update API Documentation",
          description: "Review and update the REST API documentation. Ensure all endpoints from the style guide are documented with examples. Cross-reference with recent code changes.",
          status: "assigned",
          priority: "medium",
          assigneeIds: [scribe._id],
          createdBy: results.command,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: ["documentation", "api", "rest"],
        });
        results.sampleTasks.push(task2);

        await ctx.db.insert("notifications", {
          mentionedAgentId: scribe._id,
          content: "📝 Documentation task assigned by Finn",
          fromAgentId: results.command,
          taskId: task2,
          delivered: false,
          createdAt: Date.now(),
        });

        await ctx.db.insert("subscriptions", {
          agentId: scribe._id,
          taskId: task2,
          subscribedAt: Date.now(),
        });
      }

      // Task 3: Competitor research (for Horizon)
      if (horizon) {
        const task3 = await ctx.db.insert("tasks", {
          title: "🔍 Competitor Analysis: Digital Wallets",
          description: "Research top 3 digital wallet competitors (Klarna, Revolut, Wise). Analyze: feature sets, pricing models, UX patterns. Create comparison matrix with screenshots.",
          status: "assigned",
          priority: "medium",
          assigneeIds: [horizon._id],
          createdBy: results.command,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: ["research", "competitors", "fintech"],
        });
        results.sampleTasks.push(task3);

        await ctx.db.insert("notifications", {
          mentionedAgentId: horizon._id,
          content: "🔍 Research task assigned by Finn",
          fromAgentId: results.command,
          taskId: task3,
          delivered: false,
          createdAt: Date.now(),
        });

        await ctx.db.insert("subscriptions", {
          agentId: horizon._id,
          taskId: task3,
          subscribedAt: Date.now(),
        });
      }
    }

    // 4. Log initialization activity
    const activity = await ctx.db.insert("activities", {
      type: "task_created",
      agentId: results.command,
      message: "🎯 Mission Control initialized by Finn. Sample tasks created for Vulture, Scribe, and Horizon.",
      metadata: { content: `${results.sampleTasks.length} tasks created` },
      createdAt: Date.now(),
    });
    results.activities.push(activity);

    return results;
  },
});

// Get full system status
export const getSystemStatus = query({
  handler: async (ctx) => {
    const [agents, tasks, activities, notifications, documents] = await Promise.all([
      ctx.db.query("agents").collect(),
      ctx.db.query("tasks").order("desc").take(20),
      ctx.db.query("activities").withIndex("by_created_at").order("desc").take(10),
      ctx.db.query("notifications").withIndex("by_delivered").collect(),
      ctx.db.query("documents").order("desc").take(5),
    ]);

    const taskCounts = {
      inbox: tasks.filter(t => t.status === "inbox").length,
      assigned: tasks.filter(t => t.status === "assigned").length,
      in_progress: tasks.filter(t => t.status === "in_progress").length,
      review: tasks.filter(t => t.status === "review").length,
      done: tasks.filter(t => t.status === "done").length,
      blocked: tasks.filter(t => t.status === "blocked").length,
    };

    const undeliveredNotifications = notifications.filter(n => !n.delivered);

    return {
      agents: agents.map(a => ({
        id: a._id,
        name: a.name,
        role: a.role,
        status: a.status,
        currentTaskId: a.currentTaskId,
      })),
      taskCounts,
      recentActivities: activities,
      pendingNotifications: undeliveredNotifications.length,
      recentDocuments: documents,
    };
  },
});
