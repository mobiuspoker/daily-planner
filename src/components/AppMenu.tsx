import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Menu, 
  Moon, 
  Sun, 
  History, 
  Download, 
  Upload, 
  Settings, 
  HelpCircle,
  FolderOpen,
  Calendar,
  FileText,
  Monitor
} from "lucide-react";
import { useThemeStore } from "../state/themeStore";
import { useSettingsStore } from "../state/settingsStore";
import { open } from "@tauri-apps/plugin-dialog";
import { appDataDir } from "@tauri-apps/api/path";
import { exportData, importData } from "../services/importExportService";
import "./AppMenu.css";

interface AppMenuProps {
  onOpenHistory: () => void;
  onOpenSummaries: () => void;
  onRunMidnightClear: () => void;
}

export function AppMenu({ onOpenHistory, onOpenSummaries, onRunMidnightClear }: AppMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const { themeMode, setThemeMode } = useThemeStore();
  const { updateSetting, getSetting } = useSettingsStore();
  const [reminderLead, setReminderLead] = useState(15);
  const [overdueWindow, setOverdueWindow] = useState(60);

  useEffect(() => {
    const lead = getSetting<number>("reminderLeadMinutes") || 15;
    const overdue = getSetting<number>("overdueWindowMinutes") || 60;
    setReminderLead(lead);
    setOverdueWindow(overdue);
  }, [getSetting]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setActiveSubmenu(null);
    }
  };

  const handleSubmenuEnter = (submenu: string, event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const submenuWidth = 220; // Approximate width of submenu
    
    // Calculate position to keep submenu in viewport
    let left = rect.left - submenuWidth - 4; // Position to the left
    let top = rect.top;
    
    // If submenu would go off the left edge, position it to the right instead
    if (left < 10) {
      left = rect.right + 4;
    }
    
    // Ensure submenu doesn't go off the bottom
    const windowHeight = window.innerHeight;
    if (top + 200 > windowHeight) { // Approximate height check
      top = Math.max(10, windowHeight - 250);
    }
    
    setSubmenuPosition({ top, left });
    setActiveSubmenu(submenu);
  };

  const handleThemeChange = async (mode: "auto" | "light" | "dark") => {
    await setThemeMode(mode);
    try { localStorage.setItem("themeMode", mode); } catch {}
    setIsOpen(false);
  };

  const handleReminderLeadChange = async (minutes: number) => {
    setReminderLead(minutes);
    await updateSetting("reminderLeadMinutes", minutes);
  };

  const handleOverdueWindowChange = async (minutes: number) => {
    setOverdueWindow(minutes);
    await updateSetting("overdueWindowMinutes", minutes);
  };

  const handleExport = async () => {
    try {
      await exportData();
      setIsOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const handleImport = async () => {
    try {
      await importData();
      setIsOpen(false);
    } catch (error) {
      console.error("Import failed:", error);
    }
  };

  const openDataFolder = async () => {
    try {
      const dataDir = await appDataDir();
      await open({
        directory: true,
        defaultPath: dataDir
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to open data folder:", error);
    }
  };

  const openSummariesFolder = async () => {
    try {
      const summariesPath = getSetting<string>("summaryDestinationFolder") || await appDataDir();
      await open({
        directory: true,
        defaultPath: summariesPath
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to open summaries folder:", error);
    }
  };

  const getThemeIcon = () => {
    if (themeMode === "auto") return <Monitor size={16} />;
    if (themeMode === "dark") return <Moon size={16} />;
    return <Sun size={16} />;
  };

  const getThemeLabel = () => {
    if (themeMode === "auto") return "Auto";
    if (themeMode === "dark") return "Dark";
    return "Light";
  };

  return (
    <div className="app-menu" ref={menuRef}>
      <button
        className="menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open menu"
        aria-expanded={isOpen}
      >
        <Menu size={20} />
      </button>

      {isOpen && (
        <div className="menu-dropdown" onKeyDown={handleKeyDown}>
          {/* Theme Section */}
          <div className="menu-section">
            <div 
              className="menu-item has-submenu"
              onMouseEnter={(e) => handleSubmenuEnter("theme", e)}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              {getThemeIcon()}
              <span>Theme: {getThemeLabel()}</span>
              <span className="submenu-arrow">‹</span>
            </div>
          </div>

          <div className="menu-divider" />

          {/* History Section */}
          <div className="menu-section">
            <button 
              className="menu-item"
              onClick={() => {
                onOpenHistory();
                setIsOpen(false);
              }}
            >
              <History size={16} />
              <span>History</span>
            </button>
            <button 
              className="menu-item"
              onClick={() => {
                onOpenSummaries();
                setIsOpen(false);
              }}
            >
              <FileText size={16} />
              <span>Summaries</span>
            </button>
          </div>

          <div className="menu-divider" />

          {/* Import/Export Section */}
          <div className="menu-section">
            <button className="menu-item" onClick={handleExport}>
              <Download size={16} />
              <span>Export Data</span>
            </button>
            <button className="menu-item" onClick={handleImport}>
              <Upload size={16} />
              <span>Import Data</span>
            </button>
            <button className="menu-item" onClick={openDataFolder}>
              <FolderOpen size={16} />
              <span>Open Data Folder</span>
            </button>
            <button className="menu-item" onClick={openSummariesFolder}>
              <FolderOpen size={16} />
              <span>Open Summaries Folder</span>
            </button>
          </div>

          <div className="menu-divider" />

          {/* Settings Section */}
          <div className="menu-section">
            <div 
              className="menu-item has-submenu"
              onMouseEnter={(e) => handleSubmenuEnter("settings", e)}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              <Settings size={16} />
              <span>Settings</span>
              <span className="submenu-arrow">‹</span>
            </div>
          </div>

          <div className="menu-divider" />

          {/* Help Section */}
          <div className="menu-section">
            <button 
              className="menu-item"
              onClick={() => {
                window.open("https://github.com/your-repo/task-planner", "_blank");
                setIsOpen(false);
              }}
            >
              <HelpCircle size={16} />
              <span>Help & About</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Render submenus as portals to escape parent constraints */}
      {activeSubmenu === "theme" && createPortal(
        <div 
          className="submenu"
          style={{ 
            position: 'fixed',
            top: submenuPosition.top, 
            left: submenuPosition.left,
            zIndex: 1002
          }}
          onMouseEnter={() => setActiveSubmenu("theme")}
          onMouseLeave={() => setActiveSubmenu(null)}
        >
          <button 
            className={`submenu-item ${themeMode === "auto" ? "active" : ""}`}
            onClick={() => handleThemeChange("auto")}
          >
            <Monitor size={16} />
            <span>Auto</span>
          </button>
          <button 
            className={`submenu-item ${themeMode === "light" ? "active" : ""}`}
            onClick={() => handleThemeChange("light")}
          >
            <Sun size={16} />
            <span>Light</span>
          </button>
          <button 
            className={`submenu-item ${themeMode === "dark" ? "active" : ""}`}
            onClick={() => handleThemeChange("dark")}
          >
            <Moon size={16} />
            <span>Dark</span>
          </button>
        </div>,
        document.body
      )}
      
      {activeSubmenu === "settings" && createPortal(
        <div 
          className="submenu"
          style={{ 
            position: 'fixed',
            top: submenuPosition.top, 
            left: submenuPosition.left,
            zIndex: 1002
          }}
          onMouseEnter={() => setActiveSubmenu("settings")}
          onMouseLeave={() => setActiveSubmenu(null)}
        >
          <div className="submenu-item setting-item">
            <span>Reminder Lead Time</span>
            <select 
              value={reminderLead}
              onChange={(e) => handleReminderLeadChange(Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
            >
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>1 hour</option>
            </select>
          </div>
          <div className="submenu-item setting-item">
            <span>Overdue Window</span>
            <select 
              value={overdueWindow}
              onChange={(e) => handleOverdueWindowChange(Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
            >
              <option value={30}>30 min</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
              <option value={480}>8 hours</option>
            </select>
          </div>
          <button 
            className="submenu-item"
            onClick={() => {
              onRunMidnightClear();
              setIsOpen(false);
            }}
          >
            <Calendar size={16} />
            <span>Run Midnight Clear Now</span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}