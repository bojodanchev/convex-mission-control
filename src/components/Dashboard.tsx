import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import TaskBoard from "./TaskBoard";
import AgentCard from "./AgentCard";
import ActivityFeed from "./ActivityFeed";
import DocumentList from "./DocumentList";
import StandupView from "./StandupView";

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "board" | "agents" | "activity" | "docs" | "standup"
  >("board");

  const agents = useQuery(api.agents.list);
  const tasksByStatus = useQuery(api.tasks.byStatus);

  if (!agents || !tasksByStatus) {
    return <div className="loading">Loading Mission Control...</div>;
  }

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <button
          className={activeTab === "board" ? "active" : ""}
          onClick={() => setActiveTab("board")}
        >
          📋 Task Board
        </button>
        <button
          className={activeTab === "agents" ? "active" : ""}
          onClick={() => setActiveTab("agents")}
        >
          🤖 Agents ({agents.length})
        </button>
        <button
          className={activeTab === "activity" ? "active" : ""}
          onClick={() => setActiveTab("activity")}
        >
          📡 Activity
        </button>
        <button
          className={activeTab === "docs" ? "active" : ""}
          onClick={() => setActiveTab("docs")}
        >
          📄 Documents
        </button>
        <button
          className={activeTab === "standup" ? "active" : ""}
          onClick={() => setActiveTab("standup")}
        >
          📊 Standup
        </button>
      </nav>

      <div className="dashboard-content">
        {activeTab === "board" && <TaskBoard tasks={tasksByStatus} />}
        {activeTab === "agents" && (
          <div className="agents-grid">
            {agents.map((agent) => (
              <AgentCard key={agent._id} agent={agent} />
            ))}
          </div>
        )}
        {activeTab === "activity" && <ActivityFeed />}
        {activeTab === "docs" && <DocumentList />}
        {activeTab === "standup" && <StandupView />}
      </div>
    </div>
  );
};

export default Dashboard;
