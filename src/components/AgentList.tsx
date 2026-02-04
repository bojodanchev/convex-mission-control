import React from "react";
import { Doc } from "../../convex/_generated/dataModel";

interface AgentListProps {
  agents: Doc<"agents">[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
}

const AgentList: React.FC<AgentListProps> = ({ agents, selectedAgentId, onSelectAgent }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "#9ece6a";
      case "blocked": return "#f7768e";
      default: return "#565f89";
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case "active": return "🟢";
      case "blocked": return "🔴";
      default: return "⚪";
    }
  };

  const getAgentEmoji = (name: string) => {
    switch (name) {
      case "Vulture": return "🦅";
      case "Scribe": return "📝";
      case "Horizon": return "🔭";
      default: return "🤖";
    }
  };

  return (
    <div className="agent-list">
      <div className="agent-list-header">
        <h3>Agents</h3>
        <span className="agent-count">{agents.length}</span>
      </div>

      <div className="agent-items">
        <div 
          className={`agent-item all-agents ${!selectedAgentId ? "selected" : ""}`}
          onClick={() => onSelectAgent("")}
        >
          <div className="agent-avatar all">
            <span>👥</span>
          </div>
          <div className="agent-info">
            <span className="agent-name">All Agents</span>
            <span className="agent-role">{agents.length} total</span>
          </div>
        </div>

        {agents.map(agent => (
          <div
            key={agent._id}
            className={`agent-item ${selectedAgentId === agent._id ? "selected" : ""}`}
            onClick={() => onSelectAgent(agent._id)}
          >
            <div className="agent-avatar" style={{ borderColor: getStatusColor(agent.status) }}>
              <span>{getAgentEmoji(agent.name)}</span>
              <span className="status-indicator" style={{ backgroundColor: getStatusColor(agent.status) }}>
                {agent.status === "active" ? "ACTIVE" : agent.status === "blocked" ? "BLOCKED" : "IDLE"}
              </span>
            </div>
            <div className="agent-info">
              <span className="agent-name">{agent.name}</span>
              <span className="agent-role">{agent.role}</span>
            </div>
            <div className="agent-status-dot">{getStatusDot(agent.status)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentList;
