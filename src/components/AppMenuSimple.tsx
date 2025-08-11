import { useState, useRef, useEffect } from "react";
import { 
  Menu, 
  History, 
  Download, 
  Upload, 
  Settings, 
  HelpCircle,
  FolderOpen,
  Calendar,
  FileText
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { appDataDir } from "@tauri-apps/api/path";
import { exportData, importData } from "../services/importExportService";
import { useSettingsStore } from "../state/settingsStore";
import "./AppMenu.css";

interface AppMenuProps {
  onOpenHistory: () => void;
  onOpenSummaries: () => void;
  onOpenSettings: () => void;
  onRunMidnightClear: () => void;
}

export function AppMenu({ onOpenHistory, onOpenSummaries, onOpenSettings, onRunMidnightClear }: AppMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { getSetting } = useSettingsStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
    }
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
          {/* View Section */}
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

          {/* Data Section */}
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

          {/* Settings & Tools Section */}
          <div className="menu-section">
            <button 
              className="menu-item"
              onClick={() => {
                onOpenSettings();
                setIsOpen(false);
              }}
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
            <button 
              className="menu-item"
              onClick={() => {
                onRunMidnightClear();
                setIsOpen(false);
              }}
            >
              <Calendar size={16} />
              <span>Run Midnight Clear</span>
            </button>
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
    </div>
  );
}