import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface Agent {
  _id: string;
  name: string;
  role: string;
  status: "idle" | "active" | "blocked";
  specialty: string[];
  lastHeartbeatAt?: number;
  currentTaskId?: string;
}

interface AgentCardProps {
  agent: Agent;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  const currentTask = useQuery(
    api.tasks.get,
    agent.currentTaskId ? { id: agent.currentTaskId as any } : "skip"
  );

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case "active":
        return "🟢";
      case "blocked":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const formatHeartbeat = (timestamp?: number) => {
    if (!timestamp) return "Never";
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className={`agent-card status-${agent.status}`}>
      <div className="agent-header">
        <div className="agent-avatar">
          {agent.name === "Vulture" && "🦅"}
          {agent.name === "Scribe" && "📝"}
          {agent.name === "Horizon" && "🔭"}
        </div>
        <div className="agent-info">
          <h3>{agent.name}</h3>
          <p className="agent-role">{agent.role}</p>
        </div>
        <div className="agent-status" title={agent.status}>
          {getStatusEmoji(agent.status)}
        </div>
      </div>

      <div className="agent-specialties">
        {agent.specialty.map((s) => (
          <span key={s} className="specialty-tag">
            {s}
          </span>
        ))}
      </div>

      {currentTask && (
        <div className="agent-current-task">
          <strong>Working on:</strong> {currentTask.title}
        </div>
      )}

      <div className="agent-footer">
        <span className="heartbeat">
          💓 {formatHeartbeat(agent.lastHeartbeatAt)}
        </span>
      </div>
    </div>
  );
};

export default AgentCard;
