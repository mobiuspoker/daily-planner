import { useEffect, useState } from "react";
import { UnifiedTaskList } from "./features/UnifiedTaskList";
import { HistoryViewer } from "./features/HistoryViewer";
import { SummaryViewer } from "./features/SummaryViewer";
import { QuickAddModal } from "./components/QuickAddModal";
import { SettingsModal } from "./components/SettingsModal";
import { Titlebar } from "./components/Titlebar";
import { AppMenu } from "./components/AppMenuSimple";
import { ChevronLeft } from "lucide-react";
import { useThemeStore } from "./state/themeStore";
import { useTaskStore } from "./state/taskStore";
import { useSettingsStore } from "./state/settingsStore";
import { initializeDatabase } from "./db/database";
import { setupNotifications } from "./services/notifications";
import { setupMidnightClear, runMidnightClear } from "./services/midnightClear";
import { setupGlobalHotkey, cleanupGlobalHotkey } from "./services/globalHotkey";
import { setupSummaryScheduler, stopSummaryScheduler } from "./services/summaryScheduler";
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
      await setupSummaryScheduler();
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
      stopSummaryScheduler();
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
        {showHistory ? (
          <h1>
            <button className="inline-back-button" onClick={() => {
              setShowHistory(false);
              setShowSummaries(false);
            }} aria-label="Back">
              <ChevronLeft size={20} />
            </button>
            History
          </h1>
        ) : showSummaries ? (
          <h1>
            <button className="inline-back-button" onClick={() => {
              setShowSummaries(false);
              setShowHistory(false);
            }} aria-label="Back">
              <ChevronLeft size={20} />
            </button>
            Summaries
          </h1>
        ) : (
          <h1>{currentDate}</h1>
        )}
        <AppMenu
          onOpenHistory={() => {
            setShowHistory(true);
            setShowSummaries(false);
          }}
          onOpenSummaries={() => {
            setShowSummaries(true);
            setShowHistory(false);
          }}
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
          <HistoryViewer />
        )}
        
        {showSummaries && (
          <SummaryViewer />
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