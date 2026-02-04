import React from "react";

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeIds: string[];
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
}

const TaskBoard: React.FC<TaskBoardProps> = ({ tasks }) => {
  // const updateTask = useMutation(api.tasks.update);

  const columns = [
    { id: "inbox", title: "📥 Inbox", tasks: tasks.inbox },
    { id: "assigned", title: "👤 Assigned", tasks: tasks.assigned },
    { id: "in_progress", title: "🔄 In Progress", tasks: tasks.in_progress },
    { id: "review", title: "👀 Review", tasks: tasks.review },
    { id: "done", title: "✅ Done", tasks: tasks.done },
    { id: "blocked", title: "🚫 Blocked", tasks: tasks.blocked },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "#ff4444";
      case "high":
        return "#ff8800";
      case "medium":
        return "#ffcc00";
      default:
        return "#88cc88";
    }
  };

  return (
    <div className="task-board">
      {columns.map((col) => (
        <div key={col.id} className="task-column">
          <h3>
            {col.title}
            <span className="task-count">{col.tasks.length}</span>
          </h3>
          <div className="task-list">
            {col.tasks.map((task) => (
              <div
                key={task._id}
                className="task-card"
                style={{
                  borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                }}
              >
                <div className="task-header">
                  <h4>{task.title}</h4>
                  <span
                    className="priority-badge"
                    style={{
                      backgroundColor: getPriorityColor(task.priority),
                    }}
                  >
                    {task.priority}
                  </span>
                </div>
                <p className="task-description">{task.description}</p>
                
                {task.assigneeIds.length > 0 && (
                  <div className="task-assignees">
                    👤 {task.assigneeIds.length} assignee
                    {task.assigneeIds.length > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskBoard;
