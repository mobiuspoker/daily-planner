import { useEffect, useState } from "react";
import { TaskList } from "./features/TaskList";
import { QuickAddModal } from "./components/QuickAddModal";
import { useThemeStore } from "./state/themeStore";
import { useTaskStore } from "./state/taskStore";
import { initializeDatabase } from "./db/database";
import { setupTrayMenu } from "./services/tray";
import { setupNotifications } from "./services/notifications";
import { setupMidnightClear, triggerMidnightClear } from "./services/midnightClear";
import { setupGlobalHotkey, cleanupGlobalHotkey } from "./services/globalHotkey";
import "./styles/App.css";

function App() {
  const { theme, initTheme } = useThemeStore();
  const { loadTasks } = useTaskStore();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  useEffect(() => {
    // Initialize app
    const init = async () => {
      await initializeDatabase();
      // Load tasks after database is initialized
      await loadTasks();
      // Temporarily disable tray menu - will fix later
      // await setupTrayMenu();
      await setupNotifications();
      await setupMidnightClear();
      await setupGlobalHotkey(() => setIsQuickAddOpen(true));
      initTheme();
    };
    
    init().catch(console.error);
    
    // Cleanup on unmount
    return () => {
      cleanupGlobalHotkey();
    };
  }, [initTheme, loadTasks]);

  return (
    <div className={`app ${theme}`}>
      <header className="app-header">
        <h1>Task Planner</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            className="theme-toggle"
            onClick={() => setIsQuickAddOpen(true)}
            aria-label="Quick add"
            title="Quick Add (Ctrl+Shift+A)"
          >
            ➕
          </button>
          <button 
            className="theme-toggle"
            onClick={async () => {
              if (confirm("Archive completed Today tasks? Incomplete tasks will remain in Today.")) {
                await triggerMidnightClear();
              }
            }}
            aria-label="Clear today"
            title="Archive completed tasks"
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
      
      <QuickAddModal 
        isOpen={isQuickAddOpen} 
        onClose={() => setIsQuickAddOpen(false)} 
      />
    </div>
  );
}

export default App;