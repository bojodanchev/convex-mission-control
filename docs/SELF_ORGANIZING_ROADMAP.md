# Mission Control UI/Functionality Analysis
## Based on @pbteja1998's Self-Organizing Squad

**Source Tweet:** https://x.com/pbteja1998/status/2017495026230775832

---

## 🔑 Key Architectural Differences

### Current MM Fintech Setup (Top-Down)
- **3 agents** with specific roles
- **Human assigns** tasks → Agents execute
- **Status:** Active with assigned work

### Bhanu Teja's Setup (Self-Organizing)
- **10 agents** with autonomous capabilities
- **Agents CREATE work** → Claim tasks → Execute
- **Peer-to-peer review:** Agents refute/praise each other
- **24/7 autonomous:** No human input required for operation

---

## 🎯 UI/Functionality Gaps to Close

### 1. **Task Creation Autonomy**
**Current:** Only Finn (Command) creates tasks.
**Needed:** Allow agents to spawn tasks based on their domain analysis.

**Implementation:**
- Add `tasks:autoCreate` mutation for agents
- Agents can propose tasks with `proposedBy` field
- Human approves or auto-approves based on risk

**MM Fintech Use:**
- Vulture finds security issue → Auto-creates "Fix XSS in auth flow"
- Horizon spots competitor feature → Auto-creates "Research [feature] implementation"
- Scribe sees doc gap → Auto-creates "Document [endpoint]"

---

### 2. **Peer-to-Peer Review System**
**Current:** Linear workflow (Assigned → In Progress → Review → Done)
**Needed:** Agents can review/comment on each other's work mid-flight.

**Implementation:**
- Add `@mention` support in task comments
- Agents can "request review" from specialist peers
- Review assignments create notifications

**MM Fintech Use:**
- Scribe writes API docs → @Vulture reviews for security accuracy
- Horizon does competitor analysis → @Finn reviews for business relevance
- Vulture does security audit → @Scribe documents findings

---

### 3. **Agent-to-Agent Communication**
**Current:** Task-based comments only
**Needed:** Direct agent messaging for coordination.

**Implementation:**
- Expand ChatPanel to allow agent↔agent DMs
- Agents can initiate conversations without human
- Log agent-agent comms in activity feed

**MM Fintech Use:**
- Vulture: "@Scribe - need docs on the auth flow I'm auditing"
- Horizon: "@Finn - competitor launched feature X, priority?"

---

### 4. **Autonomous Task Claiming**
**Current:** Tasks pre-assigned to specific agents
**Needed:** Agents browse "Inbox" and claim work matching their skills.

**Implementation:**
- Add `skills` array to agent schema
- Add `requiredSkills` to tasks
- Agents can `claimTask(taskId)` if skills match
- "Inbox" becomes a pool anyone can pull from

**MM Fintech Use:**
- General task: "Review PR #123" → Any agent with "code-review" skill claims
- Specialist task: "Audit PCI compliance" → Only Vulture can claim

---

### 5. **Work Generation (The Big One)**
**Current:** Reactive — agents wait for orders
**Needed:** Proactive — agents identify work and propose it

**Implementation:**
- **Vulture:** Patrols repos → Opens tasks for code smells
- **Horizon:** Monitors fintech news → Opens research tasks
- **Scribe:** Scans wiki gaps → Opens documentation tasks
- **New Agent?** Analytics agent monitoring metrics → Opens optimization tasks

**Heartbeat Expansion:**
- Agents don't just check assigned work
- Agents proactively scan their domain for new work

---

## 🏗️ MM Fintech Implementation Plan

### Phase 1: Task Autonomy (This Week)
1. Add `proposedBy` field to tasks
2. Add `skills` to agents, `requiredSkills` to tasks
3. Create `tasks:claim` mutation
4. Add "Inbox" pool to TaskBoard

### Phase 2: Peer Review (Next Week)
1. Add `@mention` parsing in comments
2. Add `requestReview(fromAgentId)` action
3. Show pending reviews in agent profiles

### Phase 3: Work Generation (Sprint)
1. **Vulture Patrol:** Cron to scan Gitea repos for security issues
2. **Horizon Intel:** Enhanced news monitoring with auto-task creation
3. **Scribe Audit:** Wiki gap analysis with task proposals

---

## 🎯 The Goal

Move from **"Human-led squad"** → **"Self-organizing squad"**

**Current State:**
> "Finn, assign me work." → Agent executes

**Target State:**
> "I found an issue. Opening task. Claiming it. Executing. Reviewing. Done." → Agent full-cycle

**Human becomes:**
- Strategy setter (high-level goals)
- Quality gate (approving high-risk autonomous work)
- Exception handler (when agents disagree)

---

**Next Action:** Start Phase 1? Add task claiming + inbox pool to the dashboard?
