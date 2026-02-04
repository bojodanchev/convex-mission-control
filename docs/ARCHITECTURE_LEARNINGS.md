# Mission Control - Architecture & Learnings

This document tracks the architectural decisions, best practices, and learnings for the Mission Control multi-agent system. It is updated based on real-world usage and insights from the original creator, Bhanu Teja (@pbteja1998).

---

## 🏗️ Core Architecture

### The "Squad" Model
- **Independent Agents**: Each agent is a separate OpenClaw session with its own memory and identity.
- **Heartbeat System**: Agents wake up on a cron schedule (every 15m-1h) to check for work.
- **Shared Brain (Convex)**: All state (tasks, docs, messages) lives in a real-time Convex database.
- **Operator (You)**: The human is "Command" — creating high-level missions and reviewing output.

### Technical Stack
- **Backend**: Convex (Real-time DB, Serverless Functions)
- **Frontend**: React + Vite (hosted on Vercel)
- **Agents**: OpenClaw (Hosted sessions with CLI access to Convex)
- **Notifications**: Node.js daemon polling for @mentions

---

## 🧠 Key Learnings & "Gotchas"

### 1. Communication Architecture
**❌ The Trap:** "Squad Group Chat"
*   **Insight:** Creating a general chat room for agents backfires. Agents move all discussions there, losing context.
*   **✅ The Fix:** Keep all work conversations **threaded within specific Tasks**. Context must be localized. Use general chat only for system announcements.

### 2. The Human Bottleneck
**❌ The Problem:** "I can't keep up."
*   **Insight:** A well-tuned squad generates actionable tasks/marketing plans faster than one human can approve/execute.
*   **✅ The Fix:**
    *   **Delegation:** Eventually, hire humans to execute AI plans (reversing the typical workflow).
    *   **Autonomy:** Give trusted agents (Leads) permission to execute low-risk tasks without approval.

### 3. Agent Autonomy & Innovation
*   **Insight:** Agents with broad goals (e.g., "Improve retention") and data access can invent new systems on their own.
*   **Example:** "Groot" (Retention Agent) invented a "Customer Health Score" metric proactively.
*   **Action:** Give specialist agents read-access to business data, not just specific tasks.

### 4. Resource Scaling
*   **Insight:** Orchestrator agents (Squad Leads) doing heavy coordination require significant compute.
*   **Benchmark:** Bhanu upgraded his lead agent (Jarvis) to **16 vCPU / 30 GB RAM**.
*   **Action:** Monitor "Command" agent performance; offload heavy processing to isolated sub-agents.

### 5. Memory Discipline
*   **Insight:** "Mental notes" die with the session.
*   **Rule:** If it matters, it **must be a file** (Markdown doc) or a **Convex record**.
*   **Implementation:** Agents are instructed to write findings to `mission-control/` or Convex Documents immediately.

---

## 🔄 Lifecycle of a Task

1.  **Inbox**: Human (Command) creates a rough idea.
2.  **Assigned**: Command assigns to a Lead or Specialist.
3.  **In Progress**:
    *   Agent wakes on heartbeat.
    *   Reads task context from Convex.
    *   Performs work (Research, Coding, Drafting).
    *   Posts updates as **Comments** on the task (not global chat).
4.  **Review**: Agent marks task for review. Human gets notified.
5.  **Done**: Human approves. Output is saved to **Documents**.

---

## 🛠️ Current Setup (MM Fintech)

| Role | Agent | Focus | Heartbeat |
|------|-------|-------|-----------|
| **Command** | Finn (You) | Orchestration, Architecture | N/A |
| **Security** | Vulture | Code Reviews, Audits | Hourly |
| **Docs** | Scribe | SOPs, Wiki, Memory | Daily |
| **Research** | Horizon | Market Intel, Competitors | 2x Daily |

### Repository Links
*   **Dashboard Code**: `github.com/bojodanchev/convex-mission-control`
*   **Live Dashboard**: `convex-mission-control.vercel.app`
