#!/usr/bin/env node
/**
 * Notification Daemon for Mission Control
 * 
 * Polls Convex every 2 seconds for undelivered @mentions
 * and delivers them to agent sessions via OpenClaw
 * 
 * Usage: node daemon/notifications.js
 * Requirements: CONVEX_URL and CONVEX_DEPLOYMENT env vars
 */

const CONVEX_URL = process.env.VITE_CONVEX_URL || "";

// Map agent names to their OpenClaw session keys
// These must match the sessions we created
const AGENT_SESSIONS = {
  "Vulture": "agent:main:subagent:e140b5bb-630d-4416-b341-1f7f7760a519",
  "Scribe": "agent:main:subagent:950e3ef4-fb76-4eaf-8c93-023994c32553", 
  "Horizon": "agent:main:subagent:90d1cca0-1939-43b8-a9a9b-255df23c7ae6",
};

// Map Convex agent IDs to names (will be populated from DB)
let agentIdToName = {};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function convexQuery(functionName, args = {}) {
  const url = `${CONVEX_URL}/api/query`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: functionName,
      args,
    }),
  });

  if (!response.ok) {
    throw new Error(`Convex query failed: ${response.statusText}`);
  }

  return await response.json();
}

async function convexMutation(functionName, args = {}) {
  const url = `${CONVEX_URL}/api/mutation`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: functionName,
      args,
    }),
  });

  if (!response.ok) {
    throw new Error(`Convex mutation failed: ${response.statusText}`);
  }

  return await response.json();
}

async function sendToAgentSession(sessionKey, message) {
  try {
    // Use OpenClaw sessions API
    const response = await fetch("http://localhost:3000/api/sessions/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionKey,
        message,
      }),
    });

    return response.ok;
  } catch (error) {
    // Agent session might not be active - will retry on next poll
    return false;
  }
}

async function loadAgentMappings() {
  try {
    const agents = await convexQuery("daemon:getAgentSessions");
    for (const agent of agents) {
      agentIdToName[agent.id] = agent.name;
    }
    console.log("📋 Loaded agent mappings:", Object.keys(agentIdToName).length);
  } catch (error) {
    console.error("Failed to load agent mappings:", error.message);
  }
}

async function pollAndDeliver() {
  try {
    // Get all undelivered notifications
    const notifications = await convexQuery("daemon:getUndelivered");

    if (notifications.length === 0) {
      return; // Nothing to deliver
    }

    console.log(`🔔 ${notifications.length} notification(s) to deliver`);

    const delivered = [];

    for (const notif of notifications) {
      const agentName = agentIdToName[notif.mentionedAgentId];
      if (!agentName) {
        console.log(`⚠️ Unknown agent ID: ${notif.mentionedAgentId}`);
        continue;
      }

      const sessionKey = AGENT_SESSIONS[agentName];
      if (!sessionKey) {
        console.log(`⚠️ No session for agent: ${agentName}`);
        continue;
      }

      const success = await sendToAgentSession(sessionKey, notif.content);

      if (success) {
        delivered.push(notif._id);
        console.log(`✅ Delivered to ${agentName}: ${notif.content.substring(0, 60)}...`);
      } else {
        console.log(`⏳ ${agentName} not available, will retry`);
      }
    }

    // Mark delivered notifications
    if (delivered.length > 0) {
      await convexMutation("daemon:markManyDelivered", { notificationIds: delivered });
      console.log(`📬 Marked ${delivered.length} as delivered`);
    }

  } catch (error) {
    console.error("❌ Poll error:", error.message);
  }
}

async function main() {
  console.log("🔔 Mission Control Notification Daemon");
  console.log("======================================");
  
  if (!CONVEX_URL) {
    console.error("❌ CONVEX_URL not set. Run: export VITE_CONVEX_URL=...");
    process.exit(1);
  }

  console.log(`📡 Convex: ${CONVEX_URL}`);
  console.log("⏱️  Polling every 2 seconds...\n");

  // Load agent mappings on startup
  await loadAgentMappings();

  // Main loop
  while (true) {
    await pollAndDeliver();
    await sleep(2000);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Daemon shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Daemon shutting down...");
  process.exit(0);
});

main().catch(console.error);
