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
        skills: ["security", "audit", "code-review", "owasp"], // NEW
        canProposeTasks: true, // NEW: Can auto-create security tasks
      },
      {
        name: "Scribe",
        role: "Documentation Agent",
        status: "idle" as const,
        sessionKey: "agent:scribe:main",
        personality: "Obsessively organized knowledge keeper",
        specialty: ["SOP maintenance", "Learnings extraction", "Wiki sync"],
        skills: ["documentation", "writing", "organization", "wiki"], // NEW
        canProposeTasks: true, // NEW: Can auto-create doc tasks
      },
      {
        name: "Horizon",
        role: "Research Agent",
        status: "idle" as const,
        sessionKey: "agent:horizon:main",
        personality: "Always scanning the horizon for threats and opportunities",
        specialty: ["Fintech news", "Regulations", "Competitor monitoring"],
        skills: ["research", "analysis", "news", "competitive-intel"], // NEW
        canProposeTasks: true, // NEW: Can auto-create research tasks
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

// Agent heartbeat - triggers work cycle
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

    // Check system pause
    const systemStatus = await ctx.db.query("systemStatus").first();
    if (systemStatus?.paused) {
      await ctx.db.patch(agent._id, {
        lastHeartbeatAt: Date.now(),
      });
      return { success: true, agentId: agent._id, status: "paused" };
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

    // Perform work cycle (claim tasks, propose work, etc.)
    const workResults = await performAgentWork(ctx, agent);

    return { 
      success: true, 
      agentId: agent._id,
      work: workResults,
    };
  },
});

// Internal work function (called by heartbeat)
async function performAgentWork(ctx: any, agent: any) {
  const results = {
    tasksClaimed: 0,
    tasksProposed: 0,
    messagesSent: 0,
  };

  // 1. CHECK INBOX — Claim tasks matching agent's skills
  if (agent.canProposeTasks && !agent.currentTaskId) {
    const inboxTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q: any) => q.eq("status", "inbox"))
      .take(10);

    for (const task of inboxTasks) {
      // Check if task requires skills this agent has
      if (task.requiredSkills?.length > 0) {
        const hasSkills = task.requiredSkills.every((skill: string) => 
          agent.skills?.includes(skill)
        );
        
        if (hasSkills && (!task.assigneeIds || task.assigneeIds.length === 0)) {
          // Claim this task
          await ctx.db.patch(task._id, {
            status: "assigned",
            assigneeIds: [agent._id],
            claimedAt: Date.now(),
            updatedAt: Date.now(),
          });
          
          await ctx.db.patch(agent._id, {
            status: "active",
            currentTaskId: task._id,
          });
          
          await ctx.db.insert("activities", {
            type: "task_claimed",
            agentId: agent._id,
            taskId: task._id,
            message: `${agent.name} auto-claimed: ${task.title}`,
            createdAt: Date.now(),
          });
          
          results.tasksClaimed++;
          break; // Only claim one task per heartbeat
        }
      }
    }
  }

  // 2. PROPOSE NEW WORK — If no tasks claimed and agent can propose
  if (agent.canProposeTasks && results.tasksClaimed === 0) {
    const proposed = await generateWorkForAgent(ctx, agent);
    results.tasksProposed = proposed;
  }

  return results;
}

// Domain-specific work generation
async function generateWorkForAgent(ctx: any, agent: any): Promise<number> {
  // Only propose work occasionally (not every heartbeat)
  const shouldPropose = Math.random() < 0.3; // 30% chance per heartbeat
  if (!shouldPropose) return 0;

  let proposedCount = 0;
  
  switch (agent.name) {
    case "Vulture":
      proposedCount += await proposeSecurityWork(ctx, agent);
      break;
    case "Scribe":
      proposedCount += await proposeDocumentationWork(ctx, agent);
      break;
    case "Horizon":
      proposedCount += await proposeResearchWork(ctx, agent);
      break;
  }
  
  return proposedCount;
}

// Work templates for each agent type
const securityWorkItems = [
  {
    title: "🔒 Review: JWT Token Expiry Handling",
    description: "Audit JWT implementation for proper expiry checking and refresh token rotation.",
    priority: "high",
    requiredSkills: ["security", "jwt", "auth"],
    tags: ["security", "jwt"],
  },
  {
    title: "🛡️ Audit: Input Validation on Payment Endpoints",
    description: "Review payment API endpoints for input validation, SQL injection prevention, XSS protection.",
    priority: "urgent",
    requiredSkills: ["security", "api", "validation"],
    tags: ["security", "api", "payments"],
  },
];

const documentationWorkItems = [
  {
    title: "📝 Document: API Error Response Format",
    description: "Standardize error response format across all APIs.",
    priority: "medium",
    requiredSkills: ["documentation", "api"],
    tags: ["docs", "api"],
  },
  {
    title: "📚 Update: Developer Onboarding Guide",
    description: "Refresh getting-started docs with latest tooling.",
    priority: "medium",
    requiredSkills: ["documentation", "onboarding"],
    tags: ["docs", "onboarding"],
  },
];

const researchWorkItems = [
  {
    title: "🔍 Competitor Analysis: Payment Flow UX",
    description: "Analyze competitor checkout UX and conversion optimizations.",
    priority: "medium",
    requiredSkills: ["research", "ux"],
    tags: ["research", "competitors"],
  },
  {
    title: "📊 Research: Open Banking Integration",
    description: "Investigate PSD2/Open Banking API opportunities.",
    priority: "medium",
    requiredSkills: ["research", "fintech"],
    tags: ["research", "open-banking"],
  },
];

async function proposeSecurityWork(ctx: any, agent: any): Promise<number> {
  let count = 0;
  for (const item of securityWorkItems) {
    const existing = await ctx.db
      .query("tasks")
      .filter((q: any) => q.eq(q.field("title"), item.title))
      .first();
    
    if (!existing) {
      await ctx.db.insert("tasks", {
        ...item,
        status: "inbox",
        assigneeIds: [],
        createdBy: agent._id,
        proposedBy: agent._id,
        requiredSkills: item.requiredSkills,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      count++;
    }
  }
  return count;
}

async function proposeDocumentationWork(ctx: any, agent: any): Promise<number> {
  let count = 0;
  for (const item of documentationWorkItems) {
    const existing = await ctx.db
      .query("tasks")
      .filter((q: any) => q.eq(q.field("title"), item.title))
      .first();
    
    if (!existing) {
      await ctx.db.insert("tasks", {
        ...item,
        status: "inbox",
        assigneeIds: [],
        createdBy: agent._id,
        proposedBy: agent._id,
        requiredSkills: item.requiredSkills,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      count++;
    }
  }
  return count;
}

async function proposeResearchWork(ctx: any, agent: any): Promise<number> {
  let count = 0;
  for (const item of researchWorkItems) {
    const existing = await ctx.db
      .query("tasks")
      .filter((q: any) => q.eq(q.field("title"), item.title))
      .first();
    
    if (!existing) {
      await ctx.db.insert("tasks", {
        ...item,
        status: "inbox",
        assigneeIds: [],
        createdBy: agent._id,
        proposedBy: agent._id,
        requiredSkills: item.requiredSkills,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      count++;
    }
  }
  return count;
}

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
