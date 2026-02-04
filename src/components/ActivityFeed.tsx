import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const ActivityFeed: React.FC = () => {
  const activities = useQuery(api.activities.list, { limit: 50 });

  if (!activities) {
    return <div className="loading">Loading activity feed...</div>;
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "task_created":
        return "🆕";
      case "task_completed":
        return "✅";
      case "message_sent":
        return "💬";
      case "document_created":
        return "📄";
      case "agent_heartbeat":
        return "💓";
      case "standup_generated":
        return "📊";
      default:
        return "🔹";
    }
  };

  const formatTime = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="activity-feed">
      <h3>📡 Real-time Activity</h3>
      <div className="feed-list">
        {activities.map((activity) => (
          <div key={activity._id} className="feed-item">
            <div className="feed-icon">{getActivityIcon(activity.type)}</div>
            <div className="feed-content">
              <p className="feed-message">{activity.message}</p>
              <span className="feed-time">{formatTime(activity.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;
