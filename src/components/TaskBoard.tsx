import React from "react";
import { Doc } from "../../convex/_generated/dataModel";

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeIds: string[];
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
}

const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, filterAgentId, agents }) => {
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
    return taskList.filter(t => t.assigneeIds.includes(filterAgentId));
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
      default: return "🤖";
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
      </div>
      
      <div className="task-board">
        {columns.map((col) => (
          <div key={col.id} className="task-column">
            <div className="column-header">
              <h3>{col.title}</h3>
              <span className="task-count">{col.tasks.length}</span>
            </div>
            
            <div className="task-list">
              {col.tasks.map((task) => (
                <div
                  key={task._id}
                  className="task-card"
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
                  
                  {task.assigneeIds.length > 0 && (
                    <div className="task-assignees">
                      {task.assigneeIds.map(id => {
                        const name = getAgentName(id);
                        return <span key={id} className="assignee-tag">{getAgentEmoji(name)} {name}</span>;
                      })}
                    </div>
                  )}
                  
                  <div className="task-meta">
                    <span className="task-time">{formatTime(task.createdAt)}</span>
                  </div>
                </div>
              ))}
              
              
              {col.tasks.length === 0 && (
                <div className="empty-column">
                  <p>No tasks</p>
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
