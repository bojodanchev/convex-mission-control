import { useQuery, useMutation } from "convex/react";
import { api } from "./_generated/api";

// Agent session mappings - update these with actual session keys
const AGENT_SESSIONS: Record<string, string> = {
  // These will be populated from the database agent records
  // and mapped to their OpenClaw session keys
};

// Map Convex agent IDs to OpenClaw session keys
const SESSION_KEY_MAP: Record<string, string> = {
  // Format: convexAgentId -> openclawSessionKey
  // Example: "jh71..." -> "agent:main:subagent:..."
};

/**
 * Notification Daemon
 * 
 * Polls Convex every 2 seconds for undelivered notifications
 * and sends them to agent sessions via OpenClaw sessions_send
 * 
 * To run:
 * 1. npx convex dev (in separate terminal)
 * 2. npm run daemon (in another terminal)
 */

async function sendNotificationToAgent(agentId: string, content: string) {
  const sessionKey = SESSION_KEY_MAP[agentId];
  if (!sessionKey) {
    console.error(`No session key found for agent ${agentId}`);
    return false;
  }

  try {
    // Use OpenClaw sessions_send to deliver notification
    // This requires the OpenClaw gateway to be running
    const response = await fetch("http://localhost:3000/api/sessions/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionKey,
        message: content,
      }),
    });

    if (response.ok) {
      console.log(`✅ Delivered to ${agentId}: ${content.substring(0, 50)}...`);
      return true;
    } else {
      console.error(`❌ Failed to deliver to ${agentId}: ${response.statusText}`);
      return false;
    }
  } catch (error) {
    // Agent session might be asleep - notification stays queued
    console.log(`⏳ Agent ${agentId} asleep, notification queued`);
    return false;
  }
}

async function pollAndDeliver() {
  console.log("🔔 Notification Daemon started");
  console.log("Polling Convex every 2 seconds for @mentions...");

  while (true) {
    try {
      // This would need to be called via Convex CLI or API
      // since we can't use React hooks in a daemon
      
      // For now, using a simple HTTP approach to Convex
      const convexUrl = process.env.CONVEX_URL || "";
      
      if (!convexUrl) {
        console.error("CONVEX_URL not set");
        await sleep(5000);
        continue;
      }

      // Query for undelivered notifications
      // This is a simplified version - in production you'd use Convex's API
      console.log("Polling for notifications...");
      
      // TODO: Implement actual Convex query
      // const notifications = await convex.query(api.notifications.getUndelivered);
      
      // For each notification, try to deliver
      // If delivery fails (agent asleep), it stays in queue for next poll
      
    } catch (error) {
      console.error("Daemon error:", error);
    }

    await sleep(2000); // Poll every 2 seconds
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Start the daemon
// pollAndDeliver();

console.log("Notification daemon script loaded");
console.log("To fully implement, this needs:");
console.log("1. Convex HTTP API access");
console.log("2. OpenClaw gateway running locally");
console.log("3. Agent session key mappings");
