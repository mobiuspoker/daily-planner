import { useEffect } from "react";
import { TaskList } from "./features/TaskList";
import { useThemeStore } from "./state/themeStore";
import { initializeDatabase } from "./db/database";
import { setupTrayMenu } from "./services/tray";
import { setupNotifications } from "./services/notifications";
import { setupMidnightClear, triggerMidnightClear } from "./services/midnightClear";
import "./styles/App.css";

function App() {
  const { theme, initTheme } = useThemeStore();

  useEffect(() => {
    // Initialize app
    const init = async () => {
      await initializeDatabase();
      // Temporarily disable tray menu - will fix later
      // await setupTrayMenu();
      await setupNotifications();
      await setupMidnightClear();
      initTheme();
    };
    
    init().catch(console.error);
  }, [initTheme]);

  return (
    <div className={`app ${theme}`}>
      <header className="app-header">
        <h1>Task Planner</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            className="theme-toggle"
            onClick={async () => {
              if (confirm("Clear all Today tasks? Incomplete tasks will move to Future.")) {
                await triggerMidnightClear();
              }
            }}
            aria-label="Clear today"
            title="Clear Today's tasks"
          >
            🗓️
          </button>
          <button 
            className="theme-toggle"
            onClick={() => useThemeStore.getState().toggleTheme()}
            aria-label="Toggle theme"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </header>
      
      <main className="app-main">
        <div className="task-container">
          <TaskList type="TODAY" />
          <TaskList type="FUTURE" />
        </div>
      </main>
    </div>
  );
}

export default App;