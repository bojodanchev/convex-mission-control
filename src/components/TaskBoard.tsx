import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";

type TaskStatus = "inbox" | "assigned" | "in_progress" | "review" | "done" | "blocked" | "waiting";

interface Task {
  _id: Id<"tasks">;
  title: string;
  description: string;
  status: TaskStatus;
  priority: string;
  assigneeIds: Id<"agents">[];
  requiredSkills?: string[];
  proposedBy?: Id<"agents">;
  tags?: string[];
  createdAt: number;
}

interface TaskBoardProps {
  tasks: {
    inbox: Task[];
    assigned: Task[];
    in_progress: Task[];
    review: Task[];
    done: Task[];
    blocked: Task[];
    waiting: Task[];
  };
  filterAgentId?: string | null;
  agents: Doc<"agents">[];
  currentAgentId?: Id<"agents">;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, filterAgentId, agents, currentAgentId }) => {
  const claimTask = useMutation(api.task_autonomy.claim);
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TaskStatus | "all">("all");

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "#f7768e";
      case "high": return "#e0af68";
      case "medium": return "#7aa2f7";
      default: return "#9ece6a";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent": return "🔴";
      case "high": return "🟠";
      case "medium": return "🟡";
      default: return "🟢";
    }
  };

  const filterTasks = (taskList: Task[]) => {
    if (!filterAgentId) return taskList;
    return taskList.filter(t => t.assigneeIds.includes(filterAgentId as Id<"agents">));
  };

  const getAgentName = (id: string) => {
    const agent = agents.find(a => a._id === id);
    return agent?.name || "Unknown";
  };

  const getAgentEmoji = (name: string) => {
    switch (name) {
      case "Vulture": return "🦅";
      case "Scribe": return "📝";
      case "Horizon": return "🔭";
      case "Finn": return "🎯";
      default: return "🤖";
    }
  };

  const canClaimTask = (task: Task): boolean => {
    if (!currentAgentId) return false;
    if (task.status !== "inbox") return false;
    
    const currentAgent = agents.find(a => a._id === currentAgentId);
    if (!currentAgent || !task.requiredSkills || task.requiredSkills.length === 0) {
      return true;
    }
    
    const agentSkills = currentAgent.skills || [];
    return task.requiredSkills.every(skill => agentSkills.includes(skill));
  };

  const getMissingSkills = (task: Task): string[] => {
    if (!currentAgentId || !task.requiredSkills) return [];
    
    const currentAgent = agents.find(a => a._id === currentAgentId);
    if (!currentAgent) return task.requiredSkills;
    
    const agentSkills = currentAgent.skills || [];
    return task.requiredSkills.filter(skill => !agentSkills.includes(skill));
  };

  const handleClaim = async (taskId: Id<"tasks">) => {
    if (!currentAgentId) return;
    
    setClaimingTaskId(taskId);
    try {
      await claimTask({ taskId, agentId: currentAgentId });
    } catch (err) {
      console.error("Failed to claim task:", err);
      alert("Failed to claim task: " + (err as Error).message);
    } finally {
      setClaimingTaskId(null);
    }
  };

  const allTasks = [
    ...tasks.inbox,
    ...tasks.assigned,
    ...tasks.in_progress,
    ...tasks.review,
    ...tasks.done,
    ...tasks.blocked,
    ...tasks.waiting,
  ];

  const columns = [
    { id: "inbox" as TaskStatus, title: "📥 Inbox", tasks: filterTasks(tasks.inbox) },
    { id: "assigned" as TaskStatus, title: "👤 Assigned", tasks: filterTasks(tasks.assigned) },
    { id: "in_progress" as TaskStatus, title: "🔄 In Progress", tasks: filterTasks(tasks.in_progress) },
    { id: "review" as TaskStatus, title: "👀 Review", tasks: filterTasks(tasks.review) },
    { id: "done" as TaskStatus, title: "✅ Done", tasks: filterTasks(tasks.done) },
    { id: "waiting" as TaskStatus, title: "⏳ Waiting", tasks: filterTasks(tasks.waiting) },
    { id: "blocked" as TaskStatus, title: "🚫 Blocked", tasks: filterTasks(tasks.blocked) },
  ];

  const filterTabs = [
    { id: "all" as const, label: "All", count: allTasks.length },
    { id: "inbox" as TaskStatus, label: "Inbox", count: tasks.inbox.length },
    { id: "assigned" as TaskStatus, label: "Assigned", count: tasks.assigned.length },
    { id: "in_progress" as TaskStatus, label: "Active", count: tasks.in_progress.length },
    { id: "review" as TaskStatus, label: "Review", count: tasks.review.length },
    { id: "done" as TaskStatus, label: "Done", count: tasks.done.length },
    { id: "waiting" as TaskStatus, label: "Waiting", count: tasks.waiting.length },
  ];

  const filteredColumns = activeFilter === "all" 
    ? columns 
    : columns.filter(col => col.id === activeFilter);

  const formatTime = (timestamp: number) => {
    const hours = Math.floor((Date.now() - timestamp) / 3600000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="task-board-container">
      <div className="task-board-header">
        <div className="header-left">
          <h2>{filterAgentId ? `${getAgentName(filterAgentId)}'s Tasks` : "Mission Queue"}</h2>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            className={`filter-tab ${activeFilter === tab.id ? "active" : ""}`}
            onClick={() => setActiveFilter(tab.id)}
          >
            {tab.label}
            <span className="tab-count">{tab.count}</span>
          </button>
        ))}
      </div>
      
      <div className="task-board">
        {filteredColumns.map((col) => (
          <div key={col.id} className={`task-column ${col.id === "inbox" ? "inbox-column" : ""} ${col.id === "waiting" ? "waiting-column" : ""}`}>
            <div className="column-header">
              <h3>{col.title}</h3>
              <span className="task-count">{col.tasks.length}</span>
            </div>
            
            <div className="task-list">
              {col.tasks.map((task) => (
                <div
                  key={task._id}
                  className={`task-card ${col.id === "inbox" ? "inbox-card" : ""}`}
                  style={{ borderLeftColor: getPriorityColor(task.priority) }}
                >
                  <div className="task-priority">
                    {getPriorityBadge(task.priority)}
                  </div>
                  
                  <h4 className="task-title">{task.title}</h4>
                  
                  <p className="task-description">
                    {task.description.length > 100 
                      ? task.description.substring(0, 100) + "..." 
                      : task.description}
                  </p>
                  
                  {/* Task Tags */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="task-tags">
                      {task.tags.map(tag => (
                        <span key={tag} className="task-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                  
                  {/* Show required skills for inbox tasks */}
                  {col.id === "inbox" && task.requiredSkills && task.requiredSkills.length > 0 && (
                    <div className="task-skills">
                      <span className="skills-label">Required:</span>
                      {task.requiredSkills.map(skill => (
                        <span key={skill} className="skill-tag">{skill}</span>
                      ))}
                    </div>
                  )}
                  
                  {/* Show who proposed the task */}
                  {task.proposedBy && (
                    <div className="task-proposed-by">
                      💡 Proposed by {getAgentName(task.proposedBy)}
                    </div>
                  )}
                  
                  {task.assigneeIds.length > 0 && (
                    <div className="task-assignees">
                      {task.assigneeIds.map(id => {
                        const name = getAgentName(id);
                        return <span key={id} className="assignee-tag">{getAgentEmoji(name)} {name}</span>;
                      })}
                    </div>
                  )}
                  
                  {/* Claim button for inbox tasks */}
                  {col.id === "inbox" && (
                    <div className="task-claim">
                      {canClaimTask(task) ? (
                        <button 
                          className="claim-btn"
                          onClick={() => handleClaim(task._id)}
                          disabled={claimingTaskId === task._id}
                        >
                          {claimingTaskId === task._id ? "Claiming..." : "🎯 Claim Task"}
                        </button>
                      ) : (
                        <div className="cannot-claim">
                          <span className="missing-skills">
                            Needs: {getMissingSkills(task).join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="task-meta">
                    <span className="task-time">{formatTime(task.createdAt)}</span>
                  </div>
                </div>
              ))}
              
              {col.tasks.length === 0 && (
                <div className="empty-column">
                  <p>{col.id === "inbox" ? "No tasks available" : "No tasks"}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskBoard;
