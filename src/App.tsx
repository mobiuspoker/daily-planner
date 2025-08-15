import { useEffect, useState } from "react";
import { UnifiedTaskList } from "./features/UnifiedTaskList";
import { HistoryViewer } from "./features/HistoryViewer";
import { SummaryViewer } from "./features/SummaryViewer";
import { QuickAddModal } from "./components/QuickAddModal";
import { SettingsModal } from "./components/SettingsModal";
import { AboutModal } from "./components/AboutModal";
import { RecurringTasksModal } from "./components/RecurringTasksModal";
import { Titlebar } from "./components/Titlebar";
import { AppMenu } from "./components/AppMenuSimple";
import { ChevronLeft } from "lucide-react";
import { useThemeStore } from "./state/themeStore";
import { useTaskStore } from "./state/taskStore";
import { useSettingsStore } from "./state/settingsStore";
import { initializeDatabase } from "./db/database";
import { setupNotifications } from "./services/notifications";
import { setupMidnightClear } from "./services/midnightClear";
import { setupGlobalHotkey, cleanupGlobalHotkey } from "./services/globalHotkey";
import { setupSummaryScheduler, stopSummaryScheduler } from "./services/summaryScheduler";
import { generateForDate } from "./services/recurringTaskService";
import { DateTime } from "luxon";
import "./styles/App.css";

function App() {
  const { theme, initTheme } = useThemeStore();
  const { loadTasks } = useTaskStore();
  const { loadSettings } = useSettingsStore();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(DateTime.local().toFormat("EEEE, MMMM d, yyyy"));
  const [showHistory, setShowHistory] = useState(false);
  const [showSummaries, setShowSummaries] = useState(false);

  useEffect(() => {
    // Initialize app
    const init = async () => {
      await initializeDatabase();
      // Apply theme as early as possible
      await initTheme();
      // Load settings and tasks after database is initialized
      await Promise.all([
        (async () => { await loadSettings(); })(),
        (async () => { await loadTasks(); })(),
        (async () => { await setupNotifications(); })(),
        (async () => { await setupMidnightClear(); })(),
        (async () => { await setupSummaryScheduler(); })(),
        (async () => { await generateForDate(DateTime.local()); })(),
        (async () => { await setupGlobalHotkey(() => setIsQuickAddOpen(true)); })(),
      ]);
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
          onOpenAbout={() => setIsAboutOpen(true)}
          onOpenRecurring={() => setIsRecurringOpen(true)}
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
      
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
      
      <RecurringTasksModal
        isOpen={isRecurringOpen}
        onClose={() => setIsRecurringOpen(false)}
      />
    </div>
  );
}

export default App;