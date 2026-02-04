import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Create a document
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("deliverable"),
      v.literal("research"),
      v.literal("protocol"),
      v.literal("note"),
      v.literal("standup")
    ),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const fromAgentId: any = "master"; // Or detect from auth

    const docId = await ctx.db.insert("documents", {
      ...args,
      createdBy: fromAgentId,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "document_created",
      taskId: args.taskId,
      message: `Document created: ${args.title}`,
      createdAt: now,
    });

    return docId;
  },
});

// Get document by ID
export const get = query({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id);
    if (!doc) return null;

    let createdByName = "Unknown";
    if (doc.createdBy !== "master") {
      const agent = await ctx.db.get(doc.createdBy);
      if (agent) createdByName = agent.name;
    } else {
      createdByName = "Master";
    }

    return { ...doc, createdByName };
  },
});

// Update document
export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const doc = await ctx.db.get(id);
    if (!doc) return { error: "Document not found" };

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activities", {
      type: "document_updated",
      taskId: doc.taskId,
      message: `Document updated: ${doc.title}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// List documents
export const list = query({
  args: {
    type: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const type = args.type;
    const taskId = args.taskId;
    let results;

    if (type) {
      results = await ctx.db
        .query("documents")
        .withIndex("by_type", (q) => q.eq("type", type as any))
        .order("desc")
        .collect();
    } else if (taskId) {
      results = await ctx.db
        .query("documents")
        .withIndex("by_task", (q) => q.eq("taskId", taskId))
        .order("desc")
        .collect();
    } else {
      results = await ctx.db
        .query("documents")
        .withIndex("by_created_at")
        .order("desc")
        .collect();
    }

    if (args.limit) {
      return results.slice(0, args.limit);
    }

    return results;
  },
});

// Get documents by type
export const byType = query({
  args: {
    type: v.union(
      v.literal("deliverable"),
      v.literal("research"),
      v.literal("protocol"),
      v.literal("note"),
      v.literal("standup")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { type, limit = 20 }) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_type", (q) => q.eq("type", type))
      .order("desc")
      .take(limit);
  },
});
