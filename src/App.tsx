import { useEffect, useState } from "react";
import { UnifiedTaskList } from "./features/UnifiedTaskList";
import { HistoryViewer } from "./features/HistoryViewer";
import { QuickAddModal } from "./components/QuickAddModal";
import { SettingsModal } from "./components/SettingsModal";
import { Titlebar } from "./components/Titlebar";
import { AppMenu } from "./components/AppMenuSimple";
import { useThemeStore } from "./state/themeStore";
import { useTaskStore } from "./state/taskStore";
import { useSettingsStore } from "./state/settingsStore";
import { initializeDatabase } from "./db/database";
import { setupNotifications } from "./services/notifications";
import { setupMidnightClear, runMidnightClear } from "./services/midnightClear";
import { setupGlobalHotkey, cleanupGlobalHotkey } from "./services/globalHotkey";
import { DateTime } from "luxon";
import "./styles/App.css";

function App() {
  const { theme, initTheme } = useThemeStore();
  const { loadTasks } = useTaskStore();
  const { loadSettings } = useSettingsStore();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(DateTime.local().toFormat("EEEE, MMMM d, yyyy"));
  const [showHistory, setShowHistory] = useState(false);
  const [showSummaries, setShowSummaries] = useState(false);

  useEffect(() => {
    // Initialize app
    const init = async () => {
      await initializeDatabase();
      // Load settings and tasks after database is initialized
      await loadSettings();
      await loadTasks();
      // Temporarily disable tray menu - will fix later
      // await setupTrayMenu();
      await setupNotifications();
      await setupMidnightClear();
      await setupGlobalHotkey(() => setIsQuickAddOpen(true));
      await initTheme();
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
  }, [initTheme, loadTasks, loadSettings]);

  const handleRunMidnightClear = async () => {
    try {
      await runMidnightClear();
      await loadTasks();
    } catch (error) {
      console.error("Failed to run midnight clear:", error);
    }
  };

  return (
    <div className={`app ${theme}`}>
      <Titlebar />
      <header className="app-header">
        <h1>{currentDate}</h1>
        <AppMenu
          onOpenHistory={() => setShowHistory(true)}
          onOpenSummaries={() => setShowSummaries(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onRunMidnightClear={handleRunMidnightClear}
        />
      </header>
      
      <main className="app-main">
        {!showHistory && !showSummaries && (
          <div className="task-container">
            <UnifiedTaskList />
          </div>
        )}
        
        {showHistory && (
          <HistoryViewer onClose={() => setShowHistory(false)} />
        )}
        
        {showSummaries && (
          <div className="summaries-placeholder">
            <button onClick={() => setShowSummaries(false)}>← Back to Tasks</button>
            <h2>Summaries Viewer</h2>
            <p>Summaries viewer will be implemented in T7</p>
          </div>
        )}
      </main>
      
      <QuickAddModal 
        isOpen={isQuickAddOpen} 
        onClose={() => setIsQuickAddOpen(false)} 
      />
      
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;