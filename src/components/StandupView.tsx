import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const StandupView: React.FC = () => {
  const latestStandup = useQuery(api.standup.latest);
  const generateStandup = useMutation(api.standup.generate);

  return (
    <div className="standup-view">
      <div className="standup-header">
        <h3>📊 Daily Standup</h3>
        <button onClick={() => generateStandup()}>🔄 Generate Now</button>
      </div>

      {latestStandup ? (
        <div className="markdown-preview">
          <pre>{latestStandup.content}</pre>
        </div>
      ) : (
        <div className="empty-state">
          <p>No standups generated yet.</p>
          <button onClick={() => generateStandup()}>Generate First Standup</button>
        </div>
      )}
    </div>
  );
};

export default StandupView;
