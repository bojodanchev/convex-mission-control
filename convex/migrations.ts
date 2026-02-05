import { mutation } from "./_generated/server";

// One-time migration to add skills to existing agents
export const migrateAgentSkills = mutation({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const updates = [];
    
    for (const agent of agents) {
      let skills: string[] = [];
      let canProposeTasks = true;
      
      switch (agent.name) {
        case "Vulture":
          skills = ["security", "audit", "code-review", "owasp", "java", "spring"];
          break;
        case "Scribe":
          skills = ["documentation", "writing", "organization", "wiki", "markdown"];
          break;
        case "Horizon":
          skills = ["research", "analysis", "news", "competitive-intel", "fintech"];
          break;
        case "Finn":
          skills = ["orchestration", "strategy", "review", "management"];
          canProposeTasks = false;
          break;
        default:
          skills = ["general"];
      }
      
      await ctx.db.patch(agent._id, {
        skills,
        canProposeTasks,
      });
      
      updates.push({
        name: agent.name,
        skills,
        canProposeTasks,
      });
    }
    
    return { updates, count: updates.length };
  },
});

// Create sample inbox tasks for demonstration
export const seedInboxTasks = mutation({
  handler: async (ctx) => {
    const tasks = [
      {
        title: "🔍 Research: PCI DSS v4.0.1 Changes",
        description: "Horizon discovered PCI DSS v4.0.1 is now live. Need comprehensive analysis of changes vs our current implementation. Focus on: new requirements, deprecated items, compliance gaps.",
        priority: "high" as const,
        requiredSkills: ["research", "fintech", "compliance"],
        tags: ["pci-dss", "compliance", "security"],
      },
      {
        title: "🛠️ Spike: Ghidra MCP Server",
        description: "New Ghidra MCP server released. Evaluate if we can build a Security MCP for Vulture to do deeper code analysis. Research: setup complexity, integration with our repos, value proposition.",
        priority: "medium" as const,
        requiredSkills: ["research", "security", "analysis"],
        tags: ["mcp", "ghidra", "security", "spike"],
      },
      {
        title: "📊 Document: API Rate Limiting Strategy",
        description: "Our payment APIs need documented rate limiting strategy. Cover: thresholds per endpoint, burst handling, client communication, monitoring/alerting.",
        priority: "medium" as const,
        requiredSkills: ["documentation", "api", "technical-writing"],
        tags: ["api", "rate-limiting", "documentation"],
      },
      {
        title: "🔒 Audit: JWT Token Validation",
        description: "Security concern raised about JWT validation in auth service. Review token expiry handling, signature verification, claims validation. Report findings.",
        priority: "urgent" as const,
        requiredSkills: ["security", "audit", "jwt", "auth"],
        tags: ["security", "jwt", "auth", "urgent"],
      },
    ];
    
    const created = [];
    const now = Date.now();
    
    for (const task of tasks) {
      // Find an agent to propose this (simulate agent work generation)
      const proposer = await ctx.db
        .query("agents")
        .withIndex("by_name", (q) => q.eq("name", "Horizon"))
        .first();
      
      const taskId = await ctx.db.insert("tasks", {
        ...task,
        status: "inbox",
        assigneeIds: [],
        createdBy: proposer?._id || "master",
        proposedBy: proposer?._id,
        createdAt: now,
        updatedAt: now,
      });
      
      created.push(taskId);
      
      // Log activity
      await ctx.db.insert("activities", {
        type: "task_created",
        agentId: proposer?._id,
        taskId,
        message: `📥 New task in inbox: ${task.title}`,
        createdAt: now,
      });
    }
    
    return { created, count: created.length };
  },
});
