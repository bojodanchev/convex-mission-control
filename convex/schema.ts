import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Agent definitions (Vulture, Scribe, Horizon)
  agents: defineTable({
    name: v.string(), // "Vulture", "Scribe", "Horizon"
    role: v.string(), // "Code Review Agent", "Documentation Agent", "Research Agent"
    status: v.union(
      v.literal("idle"),
      v.literal("active"),
      v.literal("blocked")
    ),
    sessionKey: v.string(), // "agent:vulture:main"
    currentTaskId: v.optional(v.id("tasks")),
    lastHeartbeatAt: v.optional(v.number()), // Unix timestamp
    personality: v.string(), // Brief personality description
    specialty: v.array(v.string()), // List of specialties
    skills: v.optional(v.array(v.string())), // NEW: Skills for task matching (e.g., "security", "docs", "research")
    canProposeTasks: v.optional(v.boolean()), // NEW: Whether agent can auto-create tasks
  })
    .index("by_name", ["name"])
    .index("by_session_key", ["sessionKey"]),

  // Tasks (Kanban board items)
  tasks: defineTable({
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("blocked")
    ),
    assigneeIds: v.array(v.id("agents")),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    createdBy: v.union(v.id("agents"), v.literal("master")),
    proposedBy: v.optional(v.id("agents")), // NEW: Agent that proposed this task (if auto-created)
    requiredSkills: v.optional(v.array(v.string())), // NEW: Skills needed to claim this task
    claimedAt: v.optional(v.number()), // NEW: When task was claimed from inbox
    createdAt: v.number(),
    updatedAt: v.number(),
    dueDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  })
    .index("by_status", ["status"])
    .index("by_assignee", ["assigneeIds"])
    .index("by_created_at", ["createdAt"])
    .index("by_proposed_by", ["proposedBy"]), // NEW: Index for finding agent-proposed tasks

  // Messages/Comments on tasks
  messages: defineTable({
    taskId: v.optional(v.id("tasks")),
    fromAgentId: v.union(v.id("agents"), v.literal("master")),
    content: v.string(),
    mentions: v.array(v.id("agents")), // @mentions
    attachments: v.optional(v.array(v.id("documents"))),
    createdAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_created_at", ["createdAt"]),

  // Activity feed (system events)
  activities: defineTable({
    type: v.union(
      v.literal("task_created"),
      v.literal("task_updated"),
      v.literal("task_completed"),
      v.literal("task_claimed"), // NEW: Task claimed from inbox
      v.literal("message_sent"),
      v.literal("document_created"),
      v.literal("document_updated"),
      v.literal("agent_heartbeat"),
      v.literal("agent_status_changed"),
      v.literal("mention"),
      v.literal("standup_generated")
    ),
    agentId: v.optional(v.id("agents")),
    taskId: v.optional(v.id("tasks")),
    message: v.string(), // Human-readable description
    metadata: v.optional(v.object({
      oldStatus: v.optional(v.string()),
      newStatus: v.optional(v.string()),
      content: v.optional(v.string()),
    })),
    createdAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_agent", ["agentId"])
    .index("by_task", ["taskId"]),

  // Documents/Deliverables
  documents: defineTable({
    title: v.string(),
    content: v.string(), // Markdown content
    type: v.union(
      v.literal("deliverable"),
      v.literal("research"),
      v.literal("protocol"),
      v.literal("note"),
      v.literal("standup")
    ),
    taskId: v.optional(v.id("tasks")),
    createdBy: v.union(v.id("agents"), v.literal("master")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_type", ["type"])
    .index("by_created_at", ["createdAt"]),

  // Notifications (@mentions)
  notifications: defineTable({
    mentionedAgentId: v.id("agents"),
    content: v.string(),
    fromAgentId: v.optional(v.id("agents")),
    taskId: v.optional(v.id("tasks")),
    messageId: v.optional(v.id("messages")),
    delivered: v.boolean(),
    createdAt: v.number(),
    deliveredAt: v.optional(v.number()),
  })
    .index("by_agent", ["mentionedAgentId"])
    .index("by_delivered", ["mentionedAgentId", "delivered"])
    .index("by_created_at", ["createdAt"]),

  // Thread subscriptions (auto-notify on replies)
  subscriptions: defineTable({
    agentId: v.id("agents"),
    taskId: v.id("tasks"),
    subscribedAt: v.number(),
  })
    .index("by_agent_task", ["agentId", "taskId"])
    .index("by_task", ["taskId"]),
});
