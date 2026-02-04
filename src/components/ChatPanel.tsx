import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const ChatPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const agents = useQuery(api.agents.list);
  const messages = useQuery(api.messages.recent, { limit: 50 });
  const createMessage = useMutation(api.messages.create);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");

  if (!agents || !messages) {
    return <div className="loading">Loading chat...</div>;
  }

  const handleSend = async () => {
    if (!messageText.trim()) return;
    
    // If no agent selected, create a general message
    const mentions = selectedAgent ? [selectedAgent] : [];
    
    await createMessage({
      taskId: "general", // Using a placeholder - in real implementation, this might be a general chat task
      content: messageText,
      mentions,
    });
    
    setMessageText("");
  };

  const selectedAgentData = selectedAgent 
    ? agents.find(a => a._id === selectedAgent)
    : null;

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>💬 Team Chat</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="chat-layout">
        <div className="chat-agents-list">
          <div 
            className={`chat-agent-item ${!selectedAgent ? "active" : ""}`}
            onClick={() => setSelectedAgent(null)}
          >
            <span>👥</span>
            <span>General</span>
          </div>
          {agents.map(agent => (
            <div
              key={agent._id}
              className={`chat-agent-item ${selectedAgent === agent._id ? "active" : ""}`}
              onClick={() => setSelectedAgent(agent._id)}
            >
              <span>
                {agent.name === "Vulture" ? "🦅" : 
                 agent.name === "Scribe" ? "📝" : 
                 agent.name === "Horizon" ? "🔭" : "👤"}
              </span>
              <span>{agent.name}</span>
              <span className={`status-dot ${agent.status}`}></span>
            </div>
          ))}
        </div>

        <div className="chat-messages-area">
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-chat">
                <p>No messages yet</p>
                <p className="hint">Start a conversation with the team</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className="chat-message">
                  <div className="message-header">
                    <span className="sender">{msg.fromAgentId === "master" ? "👤 You" : "🤖 Agent"}</span>
                    <span className="time">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="message-content">{msg.content}</p>
                </div>
              ))
            )}
          </div>

          <div className="chat-input-area">
            {selectedAgentData && (
              <div className="replying-to">
                Messaging: {selectedAgentData.name}
                <button onClick={() => setSelectedAgent(null)}>×</button>
              </div>
            )}
            <div className="chat-input-row">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={selectedAgent 
                  ? `Message ${selectedAgentData?.name}...` 
                  : "Message all agents..."}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
              />
              <button onClick={handleSend} disabled={!messageText.trim()}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
