import { useEffect, useState } from "react";
import { UnifiedTaskList } from "./features/UnifiedTaskList";
import { QuickAddModal } from "./components/QuickAddModal";
import { useThemeStore } from "./state/themeStore";
import { useTaskStore } from "./state/taskStore";
import { initializeDatabase } from "./db/database";
import { setupTrayMenu } from "./services/tray";
import { setupNotifications } from "./services/notifications";
import { setupMidnightClear, triggerMidnightClear } from "./services/midnightClear";
import { setupGlobalHotkey, cleanupGlobalHotkey } from "./services/globalHotkey";
import { DateTime } from "luxon";
import { Moon, Sun } from "lucide-react";
import "./styles/App.css";

function App() {
  const { theme, initTheme } = useThemeStore();
  const { loadTasks } = useTaskStore();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(DateTime.local().toFormat("EEEE, MMMM d, yyyy"));

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
    
    // Update date at midnight
    const interval = setInterval(() => {
      setCurrentDate(DateTime.local().toFormat("EEEE, MMMM d, yyyy"));
    }, 60000); // Check every minute
    
    // Cleanup on unmount
    return () => {
      cleanupGlobalHotkey();
      clearInterval(interval);
    };
  }, [initTheme, loadTasks]);

  return (
    <div className={`app ${theme}`}>
      <header className="app-header">
        <h1>{currentDate}</h1>
        <button 
          className="theme-toggle"
          onClick={() => useThemeStore.getState().toggleTheme()}
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>
      
      <main className="app-main">
        <div className="task-container">
          <UnifiedTaskList />
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