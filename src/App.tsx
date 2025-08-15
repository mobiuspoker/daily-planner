import { useEffect, useState, useRef } from "react";
import { UnifiedTaskList } from "./features/UnifiedTaskList";
import { HistoryViewer } from "./features/HistoryViewer";
import { SummaryViewer } from "./features/SummaryViewer";
import { QuickAddModal } from "./components/QuickAddModal";
import { SettingsModal } from "./components/SettingsModal";
import { AboutModal } from "./components/AboutModal";
import { RecurringTasksModal } from "./components/RecurringTasksModal";
import { Greeting } from "./components/Greeting";
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
import { invoke } from "@tauri-apps/api/core";
import "./styles/App.css";

// Note: Window visibility is controlled by the backend after 'frontend-ready'

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
  const [showGreeting, setShowGreeting] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initialized.current) return;
    let mounted = true;
    let dateInterval: ReturnType<typeof setInterval> | null = null;
    
    // Initialize app with proper error handling and sequencing
    const init = async () => {
      try {
        // Stage 1: Critical initialization (theme, database, settings)
        await initTheme();
        await initializeDatabase();
        await loadSettings();

        // Stage 2: Load tasks before showing window
        await loadTasks();
        
        // Stage 3: Ensure DOM is fully painted before showing window
        if (typeof window !== 'undefined' && (window as any).__TAURI__) {
          // Wait for multiple frames to ensure everything is painted
          await new Promise(resolve => setTimeout(resolve, 50));
          await new Promise(resolve => requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
          }));
          try {
            await invoke('frontend_ready');
          } catch (error) {
            console.warn('Failed to notify backend of frontend ready state:', error);
          }
        }

        // Stage 4: Initialize background services (use allSettled for resilience)
        const services = await Promise.allSettled([
          setupNotifications(),
          setupMidnightClear(),
          setupSummaryScheduler(),
          generateForDate(DateTime.local()),
          setupGlobalHotkey(() => mounted && setIsQuickAddOpen(true)),
        ]);
        
        // Log any service initialization failures
        services.forEach((result, index) => {
          if (result.status === 'rejected') {
            const serviceName = ['notifications', 'midnight clear', 'summary scheduler', 'recurring tasks', 'global hotkey'][index];
            console.error(`Failed to initialize ${serviceName}:`, result.reason);
          }
        });
      } catch (error) {
        console.error('Critical initialization failed:', error);
        // Could show an error UI here if needed
      }
    };
    
    init();
    initialized.current = true;
    
    // Update date at midnight (only if component is still mounted)
    dateInterval = setInterval(() => {
      if (mounted) {
        const newDate = DateTime.local().toFormat("EEEE, MMMM d, yyyy");
        setCurrentDate(prev => prev !== newDate ? newDate : prev); // Only update if changed
      }
    }, 60000); // Check every minute
    
    // Cleanup on unmount
    return () => {
      mounted = false;
      if (dateInterval) clearInterval(dateInterval);
      
      // Cleanup services (with error handling)
      try { cleanupGlobalHotkey(); } catch (e) { console.error('Failed to cleanup hotkey:', e); }
      try { stopSummaryScheduler(); } catch (e) { console.error('Failed to stop scheduler:', e); }
      try { useThemeStore.getState().cleanup(); } catch (e) { console.error('Failed to cleanup theme:', e); }
    };
  }, [initTheme, loadTasks, loadSettings]); // Keep necessary dependencies


  return (
    <>
      {showGreeting && <Greeting onComplete={() => setShowGreeting(false)} />}
      <div className={`app ${theme}`} style={{ opacity: showGreeting ? 0 : 1, transition: 'opacity 0.3s ease-in-out' }}>
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
    </>
  );
}

export default App;