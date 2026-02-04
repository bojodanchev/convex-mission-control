# Convex Mission Control for MM Fintech

Real-time multi-agent task management system inspired by @pbteja1998's architecture.

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   React UI      │────▶│    Convex    │◀────│  Agent Crons    │
│  (Dashboard)    │     │  (Database)  │     │ (OpenClaw)      │
└─────────────────┘     └──────────────┘     └─────────────────┘
         │                       │                       │
         │              ┌────────▼─────────┐            │
         │              │  Real-time Sync  │            │
         │              └──────────────────┘            │
         ▼                                              ▼
┌─────────────────┐                          ┌─────────────────┐
│  Master (You)   │◀─────────────────────────│  Agent Squad    │
│   Telegram      │     Daily Standup        │  Vulture/Scribe/│
└─────────────────┘                          │  Horizon        │
                                             └─────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
cd convex-mission-control
npm install
```

### 2. Set Up Convex

```bash
npx convex dev --once --configure=new
```

This will:
- Prompt for Convex login (create account if needed)
- Create a new project
- Set up your `.env.local` with `CONVEX_URL`

### 3. Deploy Schema

```bash
npx convex dev
```

This watches for changes and auto-deploys schema/functions.

### 4. Run Frontend

```bash
npm run dev
```

Open http://localhost:5173

## Project Structure

```
convex-mission-control/
├── convex/
│   ├── schema.ts          # Database schema
│   ├── agents.ts          # Agent CRUD operations
│   ├── tasks.ts           # Task management
│   ├── messages.ts        # Comments/messages
│   ├── activities.ts      # Activity feed
│   ├── documents.ts       # Deliverables storage
│   └── notifications.ts   # @mention system
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx      # Main dashboard
│   │   ├── TaskBoard.tsx      # Kanban board
│   │   ├── AgentCard.tsx      # Agent status card
│   │   ├── ActivityFeed.tsx   # Real-time activity
│   │   └── TaskDetail.tsx     # Task view with comments
│   ├── hooks/
│   │   └── useConvex.ts       # Convex React hooks
│   └── App.tsx
├── package.json
└── README.md
```

## Schema Overview

### Agents
- `name`: Agent name (Vulture, Scribe, Horizon)
- `role`: Job title
- `status`: idle | active | blocked
- `sessionKey`: OpenClaw session identifier
- `currentTaskId`: Currently assigned task

### Tasks
- `title`: Task name
- `description`: Details
- `status`: inbox | assigned | in_progress | review | done | blocked
- `assigneeIds`: Array of assigned agent IDs
- `priority`: low | medium | high | urgent

### Messages
- `taskId`: Parent task
- `fromAgentId`: Who posted
- `content`: Message text
- `mentions`: Array of @mentioned agent IDs
- `attachments`: Linked documents

### Activities
- `type`: task_created | message_sent | document_created | etc.
- `agentId`: Who did it
- `message`: Human-readable description
- `metadata`: Additional context

### Documents
- `title`: Document name
- `content`: Markdown content
- `type`: deliverable | research | protocol | note
- `taskId`: Optional parent task

### Notifications
- `mentionedAgentId`: Who should receive
- `content`: Notification text
- `delivered`: Boolean
- `createdAt`: Timestamp

## Integration with OpenClaw

### Agent Heartbeat Configuration

Update your agent crons to use Convex:

```bash
# Vulture - Code Review
openclaw cron add \
  --name "vulture-heartbeat" \
  --cron "0 * * * *" \
  --session isolated \
  --message "npx convex run agents:heartbeat '{\"agentName\": \"Vulture\"}'"

# Scribe - Documentation  
openclaw cron add \
  --name "scribe-heartbeat" \
  --cron "0 9 * * *" \
  --session isolated \
  --message "npx convex run agents:heartbeat '{\"agentName\": \"Scribe\"}'"

# Horizon - Research
openclaw cron add \
  --name "horizon-heartbeat" \
  --cron "0 */12 * * *" \
  --session isolated \
  --message "npx convex run agents:heartbeat '{\"agentName\": \"Horizon\"}'"
```

### Agent Action Functions

Agents can call Convex via CLI:

```bash
# Post a comment
npx convex run messages:create '{
  "taskId": "<task-id>",
  "fromAgentId": "<agent-id>",
  "content": "Found security issue in auth.js",
  "mentions": ["<scribe-agent-id>"]
}'

# Update task status
npx convex run tasks:update '{
  "id": "<task-id>",
  "status": "review"
}'

# Create document
npx convex run documents:create '{
  "title": "Security Audit Report",
  "content": "# Findings...",
  "type": "deliverable",
  "taskId": "<task-id>"
}'
```

## Daily Standup

Auto-generated at 17:30 Sofia time:

```bash
openclaw cron add \
  --name "daily-standup" \
  --cron "30 17 * * *" \
  --tz "Europe/Sofia" \
  --session isolated \
  --message "npx convex run standup:generate"
```

## Environment Variables

Create `.env.local`:

```bash
VITE_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=your-deployment:your-project
```

## Features

✅ **Real-time Updates** — Changes sync instantly across all clients  
✅ **@Mentions** — Agents can notify each other  
✅ **Task Board** — Kanban view with drag-and-drop  
✅ **Activity Feed** — Live stream of all actions  
✅ **Document Storage** — Markdown deliverables  
✅ **Agent Status** — See who's working on what  
✅ **Daily Standup** — Automated summary generation  

## Next Steps

1. Run `npm install` in `convex-mission-control/`
2. Run `npx convex dev --once --configure=new`
3. Update agent heartbeats to use Convex functions
4. Deploy frontend when ready

---

Built for MM Fintech | Inspired by @pbteja1998
