import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import AgentList from "./AgentList";
import AgentProfile from "./AgentProfile";
import TaskBoard from "./TaskBoard";
import ActivityFeed from "./ActivityFeed";
import DocumentList from "./DocumentList";
import StandupView from "./StandupView";
import BroadcastPanel from "./BroadcastPanel";
import ChatPanel from "./ChatPanel";

const Dashboard: React.FC = () => {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"tasks" | "activity" | "docs" | "standup">("tasks");
  const [filterAgent, setFilterAgent] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);

  const agents = useQuery(api.agents.list);
  const tasksByStatus = useQuery(api.tasks.byStatus);
  const pauseStatus = useQuery(api.tasks.getPauseStatus);
  const togglePause = useMutation(api.tasks.togglePause);

  if (!agents || !tasksByStatus || pauseStatus === undefined) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Initializing Mission Control...</p>
      </div>
    );
  }

  const totalTasks = Object.values(tasksByStatus).flat().length;
  const activeAgents = agents.filter(a => a.status === "active").length;
  const isPaused = pauseStatus?.paused || false;

  const selectedAgent = selectedAgentId 
    ? agents.find(a => a._id === selectedAgentId) 
    : null;

  const handleTogglePause = async () => {
    try {
      await togglePause({ paused: !isPaused });
    } catch (err) {
      console.error("Failed to toggle pause:", err);
    }
  };

  return (
    <div className="dashboard">
      {/* Top Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">🎯</span>
            <h1>Mission Control</h1>
          </div>
        </div>

        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-value">{activeAgents}</span>
            <span className="stat-label">Agents Active</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{totalTasks}</span>
            <span className="stat-label">Tasks in Queue</span>
          </div>
        </div>

        <div className="header-filters">
          <select 
            className="filter-select"
            value={filterAgent || ""}
            onChange={(e) => setFilterAgent(e.target.value || null)}
          >
            <option value="">All Agents</option>
            {agents.map(agent => (
              <option key={agent._id} value={agent._id}>{agent.name}</option>
            ))}
          </select>
        </div>

        <div className="header-actions">
          {/* System Pause Button */}
          <button 
            className={`action-btn pause-btn ${isPaused ? "paused" : ""}`}
            onClick={handleTogglePause}
            title={isPaused ? "Resume all agents" : "Pause all agents"}
          >
            <span>{isPaused ? "▶️" : "⏸️"}</span>
            {isPaused ? "RESUMED" : "PAUSE"}
          </button>

          <button 
            className={`action-btn chat-btn ${showChat ? "active" : ""}`}
            onClick={() => {
              setShowChat(!showChat);
              setShowBroadcast(false);
            }}
          >
            <span>💬</span>
            Chat
          </button>
          <button 
            className={`action-btn broadcast-btn ${showBroadcast ? "active" : ""}`}
            onClick={() => {
              setShowBroadcast(!showBroadcast);
              setShowChat(false);
            }}
          >
            <span>📢</span>
            Broadcast
          </button>
          <button 
            className={`action-btn docs-btn ${activeView === "docs" ? "active" : ""}`}
            onClick={() => setActiveView("docs")}
          >
            <span>📄</span>
            Docs
          </button>
          <button 
            className={`action-btn standup-btn ${activeView === "standup" ? "active" : ""}`}
            onClick={() => setActiveView("standup")}
          >
            <span>📊</span>
            Standup
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="dashboard-body">
        {/* Left Sidebar - Agent List */}
        <aside className="sidebar-left">
          <AgentList 
            agents={agents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
          />
        </aside>

        {/* Center - Main Content */}
        <main className="main-content">
          {activeView === "tasks" && (
            <TaskBoard 
              tasks={tasksByStatus} 
              filterAgentId={filterAgent}
              agents={agents}
              currentAgentId={filterAgent as Id<"agents"> | undefined}
            />
          )}
          {activeView === "activity" && <ActivityFeed />}
          {activeView === "docs" && <DocumentList />}
          {activeView === "standup" && <StandupView />}
        </main>

        {/* Right Sidebar - Agent Profile */}
        <aside className={`sidebar-right ${selectedAgent ? "open" : ""}`}>
          {selectedAgent ? (
            <AgentProfile 
              agent={selectedAgent} 
              onClose={() => setSelectedAgentId(null)}
            />
          ) : (
            <div className="profile-placeholder">
              <p>Select an agent to view profile</p>
            </div>
          )}
        </aside>
      </div>

      {/* Bottom Navigation (mobile) */}
      <nav className="bottom-nav">
        <button 
          className={activeView === "tasks" ? "active" : ""}
          onClick={() => setActiveView("tasks")}
        >
          📋 Tasks
        </button>
        <button 
          className={activeView === "activity" ? "active" : ""}
          onClick={() => setActiveView("activity")}
        >
          📡 Activity
        </button>
        <button 
          className={activeView === "docs" ? "active" : ""}
          onClick={() => setActiveView("docs")}
        >
          📄 Docs
        </button>
        <button 
          className={activeView === "standup" ? "active" : ""}
          onClick={() => setActiveView("standup")}
        >
          📊 Standup
        </button>
      </nav>

      {/* Chat Panel */}
      {showChat && (
        <div className="panel-overlay" onClick={() => setShowChat(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ChatPanel onClose={() => setShowChat(false)} />
          </div>
        </div>
      )}

      {/* Broadcast Panel */}
      {showBroadcast && (
        <div className="panel-overlay" onClick={() => setShowBroadcast(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <BroadcastPanel onClose={() => setShowBroadcast(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
