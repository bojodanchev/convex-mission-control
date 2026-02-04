import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";

interface AgentProfileProps {
  agent: Doc<"agents">;
  onClose: () => void;
}

const AgentProfile: React.FC<AgentProfileProps> = ({ agent, onClose }) => {
  const notifications = useQuery(api.notifications.undelivered, { agentId: agent._id });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "#9ece6a";
      case "blocked": return "#f7768e";
      default: return "#565f89";
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

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "Never";
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="agent-profile">
      <button className="profile-close" onClick={onClose}>×</button>
      
      <div className="profile-header">
        <div className="profile-avatar" style={{ borderColor: getStatusColor(agent.status) }}>
          <span>{getAgentEmoji(agent.name)}</span>
        </div>
        <div className="profile-title">
          <h2>{agent.name}</h2>
          <p>{agent.role}</p>
        </div>
      </div>

      <div 
        className="profile-status"
        style={{ 
          backgroundColor: `${getStatusColor(agent.status)}20`,
          borderColor: getStatusColor(agent.status),
          color: getStatusColor(agent.status)
        }}
      >
        ● {agent.status.toUpperCase()}
      </div>

      <div className="profile-section">
        <h4>Status Reason</h4>
        <p className="status-reason">
          {agent.currentTaskId 
            ? `Working on assigned task` 
            : agent.status === "idle" 
              ? "Waiting for assignments" 
              : agent.status === "blocked"
                ? "Blocked - needs assistance"
                : "Active and operational"}
        </p>
        <span className="last-seen">Last heartbeat: {formatTime(agent.lastHeartbeatAt)}</span>
      </div>

      <div className="profile-section">
        <h4>About</h4>
        <p className="about-text">{agent.personality}</p>
        <div className="specialties">
          {agent.specialty.map((s, i) => (
            <span key={i} className="specialty-tag">{s}</span>
          ))}
        </div>
      </div>

      <div className="profile-tabs">
        <button className="tab active">
          🔔 Attention
          {notifications && notifications.length > 0 && (
            <span className="badge">{notifications.length}</span>
          )}
        </button>
        <button className="tab">📊 Timeline</button>
        <button className="tab">💬 Messages</button>
      </div>

      {notifications && notifications.length > 0 && (
        <div className="profile-section notifications">
          <h4>🔔 Unread Mentions ({notifications.length})</h4>
          {notifications.slice(0, 5).map(notif => (
            <div key={notif._id} className="notification-item">
              <p>{notif.content}</p>
              <span>{formatTime(notif.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="profile-section message-section">
        <h4>Send Message to {agent.name}</h4>
        <div className="message-input-container">
          <input 
            type="text" 
            placeholder={`Message ${agent.name}... (@ to mention)`}
            className="message-input"
          />
          <button className="send-btn">Send</button>
        </div>
      </div>
    </div>
  );
};

export default AgentProfile;
