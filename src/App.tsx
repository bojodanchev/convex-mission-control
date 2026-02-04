import { ConvexProvider, ConvexReactClient } from "convex/react";
import Dashboard from "./components/Dashboard";
import "./App.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "";
const convex = new ConvexReactClient(convexUrl);

function App() {
  return (
    <ConvexProvider client={convex}>
      <div className="App">
        <header className="app-header">
          <h1>🎯 Mission Control</h1>
          <p className="subtitle">MM Fintech Agent Squad Dashboard</p>
        </header>
        <Dashboard />
      </div>
    </ConvexProvider>
  );
}

export default App;
