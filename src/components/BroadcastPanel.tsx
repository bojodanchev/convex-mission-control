import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const BroadcastPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const agents = useQuery(api.agents.list);
  const broadcastStats = useQuery(api.broadcast.getStats);
  const sendBroadcast = useMutation(api.broadcast.send);
  
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [category, setCategory] = useState("announcement");
  const [targetMode, setTargetMode] = useState<"all" | "specific">("all");
  const [selectedAgents, setSelectedAgents] = useState<Id<"agents">[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; recipientCount?: number } | null>(null);

  if (!agents || !broadcastStats) {
    return <div className="loading">Loading...</div>;
  }

  const handleSend = async () => {
    if (!message.trim()) return;
    
    setSending(true);
    try {
      const targetAgents = targetMode === "specific" ? selectedAgents : undefined;
      const res = await sendBroadcast({
        content: message,
        targetAgents,
        priority,
        category,
      });
      setResult({ success: true, recipientCount: res.recipientCount });
      setMessage("");
      setSelectedAgents([]);
      setTimeout(() => setResult(null), 3000);
    } catch (error) {
      setResult({ success: false });
    }
    setSending(false);
  };

  const toggleAgent = (agentId: Id<"agents">) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "urgent": return "#f7768e";
      case "high": return "#e0af68";
      case "low": return "#9ece6a";
      default: return "#7aa2f7";
    }
  };

  if (!isOpen) {
    return (
      <button 
        className="broadcast-toggle-btn"
        onClick={() => setIsOpen(true)}
      >
        📢 Broadcast
        {broadcastStats.pendingBroadcasts > 0 && (
          <span className="broadcast-badge">{broadcastStats.pendingBroadcasts}</span>
        )}
      </button>
    );
  }

  return (
    <div className="broadcast-panel">
      <div className="broadcast-header">
        <h3>📢 Broadcast Message</h3>
        <button className="close-btn" onClick={() => {
          setIsOpen(false);
          onClose?.();
        }}>×</button>
      </div>

      <div className="broadcast-stats">
        <span>👥 {broadcastStats.totalAgents} agents</span>
        <span>🔔 {broadcastStats.pendingBroadcasts} pending</span>
        <span>🟢 {broadcastStats.activeAgents} active</span>
      </div>

      <div className="broadcast-form">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your broadcast message to all agents..."
          rows={4}
          className="broadcast-input"
        />

        <div className="broadcast-options">
          <div className="option-group">
            <label>Priority:</label>
            <div className="priority-selector">
              {(["low", "normal", "high", "urgent"] as const).map(p => (
                <button
                  key={p}
                  className={`priority-btn ${priority === p ? "active" : ""}`}
                  onClick={() => setPriority(p)}
                  style={{ 
                    borderColor: getPriorityColor(p),
                    backgroundColor: priority === p ? getPriorityColor(p) : "transparent",
                    color: priority === p ? "#000" : getPriorityColor(p)
                  }}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="option-group">
            <label>Category:</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="category-select"
            >
              <option value="announcement">📢 Announcement</option>
              <option value="alert">🚨 Alert</option>
              <option value="update">📝 Update</option>
              <option value="mission">🎯 Mission</option>
            </select>
          </div>

          <div className="option-group">
            <label>Target:</label>
            <div className="target-selector">
              <button
                className={targetMode === "all" ? "active" : ""}
                onClick={() => setTargetMode("all")}
              >
                📢 All Agents
              </button>
              <button
                className={targetMode === "specific" ? "active" : ""}
                onClick={() => setTargetMode("specific")}
              >
                🎯 Specific
              </button>
            </div>
          </div>
        </div>

        {targetMode === "specific" && (
          <div className="agent-selector">
            <p>Select agents:</p>
            <div className="agent-checkboxes">
              {agents.map(agent => (
                <label key={agent._id} className="agent-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedAgents.includes(agent._id)}
                    onChange={() => toggleAgent(agent._id)}
                  />
                  <span className="agent-emoji">
                    {agent.name === "Vulture" ? "🦅" : 
                     agent.name === "Scribe" ? "📝" : 
                     agent.name === "Horizon" ? "🔭" : "👤"}
                  </span>
                  {agent.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <button 
          className="send-broadcast-btn"
          onClick={handleSend}
          disabled={sending || !message.trim() || (targetMode === "specific" && selectedAgents.length === 0)}
        >
          {sending ? "Sending..." : `📢 Broadcast to ${targetMode === "all" ? "All" : selectedAgents.length} Agents`}
        </button>

        {result && (
          <div className={`broadcast-result ${result.success ? "success" : "error"}`}>
            {result.success 
              ? `✅ Broadcast sent to ${result.recipientCount} agents` 
              : "❌ Failed to send broadcast"}
          </div>
        )}
      </div>
    </div>
  );
};

export default BroadcastPanel;
