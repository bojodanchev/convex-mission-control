import { v } from "convex/values";
import { query, mutation, internalAction } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Agent performs work on heartbeat
export const doWork = mutation({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, { agentId }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) throw new Error("Agent not found");
    
    // Check system pause
    const pauseStatus = await ctx.db.query("systemStatus").first();
    if (pauseStatus?.paused) {
      return { status: "paused", message: "System is paused" };
    }

    const results = {
      tasksClaimed: 0,
      tasksCompleted: 0,
      tasksProposed: 0,
      messagesSent: 0,
    };

    // 1. CHECK INBOX — Claim tasks matching agent's skills
    if (agent.canProposeTasks) {
      const inboxTasks = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", "inbox"))
        .take(10);

      for (const task of inboxTasks) {
        // Check if task requires skills this agent has
        const requiredSkills = task.requiredSkills || [];
        if (requiredSkills.length > 0) {
          const hasSkills = requiredSkills.every(skill => 
            agent.skills?.includes(skill)
          );
          
          if (hasSkills && !task.assigneeIds?.length) {
            // Claim this task
            await ctx.db.patch(task._id, {
              status: "assigned",
              assigneeIds: [agentId],
              claimedAt: Date.now(),
              updatedAt: Date.now(),
            });
            
            await ctx.db.patch(agentId, {
              status: "active",
              currentTaskId: task._id,
            });
            
            await ctx.db.insert("activities", {
              type: "task_claimed",
              agentId,
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

    // 2. WORK ON CURRENT TASK — If agent has an assigned task
    if (agent.currentTaskId) {
      const currentTask = await ctx.db.get(agent.currentTaskId);
      
      if (currentTask?.status === "assigned") {
        // Start working
        await ctx.db.patch(currentTask._id, {
          status: "in_progress",
          updatedAt: Date.now(),
        });
        
        await ctx.db.insert("activities", {
          type: "task_updated",
          agentId,
          taskId: currentTask._id,
          message: `${agent.name} started working on: ${currentTask.title}`,
          metadata: { oldStatus: "assigned", newStatus: "in_progress" },
          createdAt: Date.now(),
        });
      }
      
      // Simulate work progress (in real implementation, this would do actual work)
      // For now, mark tasks as complete after some time or conditions
    }

    // 3. PROPOSE NEW WORK — Domain-specific work generation
    if (agent.canProposeTasks && results.tasksClaimed === 0) {
      const proposedTasks = await generateWorkForAgent(ctx, agent);
      results.tasksProposed = proposedTasks;
    }

    // Update heartbeat
    await ctx.db.patch(agentId, {
      lastHeartbeatAt: Date.now(),
    });

    return {
      status: "active",
      agent: agent.name,
      ...results,
    };
  },
});

// Domain-specific work generation
async function generateWorkForAgent(ctx: any, agent: any): Promise<number> {
  let proposedCount = 0;
  
  switch (agent.name) {
    case "Vulture":
      // Security: Propose audits based on common patterns
      proposedCount += await proposeSecurityWork(ctx, agent);
      break;
      
    case "Scribe":
      // Docs: Propose documentation gaps
      proposedCount += await proposeDocumentationWork(ctx, agent);
      break;
      
    case "Horizon":
      // Research: Propose intel gathering
      proposedCount += await proposeResearchWork(ctx, agent);
      break;
  }
  
  return proposedCount;
}

// Vulture: Propose security audits
async function proposeSecurityWork(ctx: any, agent: any): Promise<number> {
  const securityTasks = [
    {
      title: "🔒 Review: JWT Token Expiry Handling",
      description: "Audit JWT implementation for proper expiry checking and refresh token rotation. Check for race conditions in token refresh.",
      priority: "high",
      requiredSkills: ["security", "jwt", "auth"],
      tags: ["security", "jwt", "audit"],
    },
    {
      title: "🛡️ Audit: Input Validation on Payment Endpoints",
      description: "Review all payment-related API endpoints for proper input validation, SQL injection prevention, and XSS protection.",
      priority: "urgent",
      requiredSkills: ["security", "api", "validation"],
      tags: ["security", "api", "payments"],
    },
    {
      title: "📋 Compliance Check: PCI DSS Requirements",
      description: "Verify current implementation against PCI DSS v4.0.1 requirements. Document gaps and remediation plan.",
      priority: "high",
      requiredSkills: ["security", "compliance", "pci-dss"],
      tags: ["security", "compliance", "pci-dss"],
    },
  ];
  
  let count = 0;
  for (const task of securityTasks) {
    // Check if similar task already exists
    const existing = await ctx.db
      .query("tasks")
      .filter((q: any) => q.eq(q.field("title"), task.title))
      .first();
    
    if (!existing) {
      await ctx.db.insert("tasks", {
        ...task,
        status: "inbox",
        assigneeIds: [],
        createdBy: agent._id,
        proposedBy: agent._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      count++;
    }
  }
  
  return count;
}

// Scribe: Propose documentation work
async function proposeDocumentationWork(ctx: any, agent: any): Promise<number> {
  const docTasks = [
    {
      title: "📝 Document: API Error Response Format",
      description: "Standardize and document error response format across all APIs. Include error codes, messages, and remediation steps.",
      priority: "medium",
      requiredSkills: ["documentation", "api", "technical-writing"],
      tags: ["docs", "api", "errors"],
    },
    {
      title: "📚 Update: Onboarding Guide for New Developers",
      description: "Refresh getting-started documentation with latest tooling, environment setup, and common pitfalls.",
      priority: "medium",
      requiredSkills: ["documentation", "onboarding", "technical-writing"],
      tags: ["docs", "onboarding"],
    },
  ];
  
  let count = 0;
  for (const task of docTasks) {
    const existing = await ctx.db
      .query("tasks")
      .filter((q: any) => q.eq(q.field("title"), task.title))
      .first();
    
    if (!existing) {
      await ctx.db.insert("tasks", {
        ...task,
        status: "inbox",
        assigneeIds: [],
        createdBy: agent._id,
        proposedBy: agent._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      count++;
    }
  }
  
  return count;
}

// Horizon: Propose research work
async function proposeResearchWork(ctx: any, agent: any): Promise<number> {
  const researchTasks = [
    {
      title: "🔍 Competitor Analysis: Klarna Checkout Flow",
      description: "Analyze Klarna's checkout UX, payment options, and conversion optimizations. Create comparison matrix with our implementation.",
      priority: "medium",
      requiredSkills: ["research", "analysis", "competitive-intel"],
      tags: ["research", "competitors", "ux"],
    },
    {
      title: "📊 Research: Open Banking APIs in EU",
      description: "Investigate PSD2/Open Banking integration opportunities. Identify banks with best APIs, compliance requirements.",
      priority: "medium",
      requiredSkills: ["research", "fintech", "api"],
      tags: ["research", "open-banking", "psd2"],
    },
  ];
  
  let count = 0;
  for (const task of researchTasks) {
    const existing = await ctx.db
      .query("tasks")
      .filter((q: any) => q.eq(q.field("title"), task.title))
      .first();
    
    if (!existing) {
      await ctx.db.insert("tasks", {
        ...task,
        status: "inbox",
        assigneeIds: [],
        createdBy: agent._id,
        proposedBy: agent._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      count++;
    }
  }
  
  return count;
}

// Request peer review from another agent
export const requestReview = mutation({
  args: {
    taskId: v.id("tasks"),
    fromAgentId: v.id("agents"),
    toAgentId: v.id("agents"),
    message: v.string(),
  },
  handler: async (ctx, { taskId, fromAgentId, toAgentId, message }) => {
    const task = await ctx.db.get(taskId);
    const fromAgent = await ctx.db.get(fromAgentId);
    const toAgent = await ctx.db.get(toAgentId);
    
    if (!task || !fromAgent || !toAgent) {
      throw new Error("Task or agent not found");
    }

    // Create review request message
    await ctx.db.insert("messages", {
      taskId,
      fromAgentId,
      content: `@${toAgent.name} ${message}`,
      mentions: [toAgentId],
      createdAt: Date.now(),
    });

    // Create notification
    await ctx.db.insert("notifications", {
      mentionedAgentId: toAgentId,
      content: `🔍 Review requested by ${fromAgent.name}: ${task.title}`,
      fromAgentId,
      taskId,
      delivered: false,
      createdAt: Date.now(),
    });

    // Move task to review status
    await ctx.db.patch(taskId, {
      status: "review",
      updatedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "task_updated",
      agentId: fromAgentId,
      taskId,
      message: `${fromAgent.name} requested review from ${toAgent.name}`,
      metadata: { newStatus: "review" },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Complete a task
export const completeTask = mutation({
  args: {
    taskId: v.id("tasks"),
    agentId: v.id("agents"),
    deliverableContent: v.optional(v.string()),
  },
  handler: async (ctx, { taskId, agentId, deliverableContent }) => {
    const task = await ctx.db.get(taskId);
    const agent = await ctx.db.get(agentId);
    
    if (!task || !agent) {
      throw new Error("Task or agent not found");
    }

    // Update task status
    await ctx.db.patch(taskId, {
      status: "review",
      updatedAt: Date.now(),
    });

    // Create deliverable document if content provided
    if (deliverableContent) {
      await ctx.db.insert("documents", {
        title: `Deliverable: ${task.title}`,
        content: deliverableContent,
        type: "deliverable",
        taskId,
        createdBy: agentId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Clear agent's current task
    await ctx.db.patch(agentId, {
      currentTaskId: undefined,
      status: "idle",
    });

    // Log completion
    await ctx.db.insert("activities", {
      type: "task_completed",
      agentId,
      taskId,
      message: `${agent.name} completed: ${task.title}`,
      createdAt: Date.now(),
    });

    // Notify command (Finn)
    const command = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", "Finn"))
      .first();
    
    if (command) {
      await ctx.db.insert("notifications", {
        mentionedAgentId: command._id,
        content: `✅ ${agent.name} completed: ${task.title}`,
        fromAgentId: agentId,
        taskId,
        delivered: false,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Send direct message to another agent
export const sendAgentMessage = mutation({
  args: {
    fromAgentId: v.id("agents"),
    toAgentId: v.id("agents"),
    content: v.string(),
  },
  handler: async (ctx, { fromAgentId, toAgentId, content }) => {
    const fromAgent = await ctx.db.get(fromAgentId);
    const toAgent = await ctx.db.get(toAgentId);
    
    if (!fromAgent || !toAgent) {
      throw new Error("Agent not found");
    }

    // Create message (not linked to a task - direct agent chat)
    const messageId = await ctx.db.insert("messages", {
      fromAgentId,
      content: `@${toAgent.name} ${content}`,
      mentions: [toAgentId],
      createdAt: Date.now(),
    });

    // Create notification
    await ctx.db.insert("notifications", {
      mentionedAgentId: toAgentId,
      content: `💬 ${fromAgent.name}: ${content.substring(0, 100)}...`,
      fromAgentId,
      messageId,
      delivered: false,
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "message_sent",
      agentId: fromAgentId,
      message: `${fromAgent.name} → ${toAgent.name}: ${content.substring(0, 50)}...`,
      createdAt: Date.now(),
    });

    return { messageId };
  },
});
