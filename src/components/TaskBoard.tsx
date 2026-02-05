import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";

interface Task {
  _id: Id<"tasks">;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeIds: Id<"agents">[];
  requiredSkills?: string[];
  proposedBy?: Id<"agents">;
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
  };
  filterAgentId?: string | null;
  agents: Doc<"agents">[];
  currentAgentId?: Id<"agents">; // For claiming tasks
}

const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, filterAgentId, agents, currentAgentId }) => {
  const claimTask = useMutation(api.task_autonomy.claim);
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);

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
    
    // Check if agent has required skills
    const currentAgent = agents.find(a => a._id === currentAgentId);
    if (!currentAgent || !task.requiredSkills || task.requiredSkills.length === 0) {
      return true; // No skills required, anyone can claim
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

  const columns = [
    { id: "inbox", title: "📥 Inbox", tasks: filterTasks(tasks.inbox) },
    { id: "assigned", title: "👤 Assigned", tasks: filterTasks(tasks.assigned) },
    { id: "in_progress", title: "🔄 In Progress", tasks: filterTasks(tasks.in_progress) },
    { id: "review", title: "👀 Review", tasks: filterTasks(tasks.review) },
    { id: "done", title: "✅ Done", tasks: filterTasks(tasks.done) },
    { id: "blocked", title: "🚫 Blocked", tasks: filterTasks(tasks.blocked) },
  ];

  const formatTime = (timestamp: number) => {
    const hours = Math.floor((Date.now() - timestamp) / 3600000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="task-board-container">
      <div className="task-board-header">
        <h2>{filterAgentId ? `${getAgentName(filterAgentId)}'s Tasks` : "All Tasks"}</h2>
        {tasks.inbox.length > 0 && (
          <span className="inbox-badge">📥 {tasks.inbox.length} available to claim</span>
        )}
      </div>
      
      <div className="task-board">
        {columns.map((col) => (
          <div key={col.id} className={`task-column ${col.id === "inbox" ? "inbox-column" : ""}`}>
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
