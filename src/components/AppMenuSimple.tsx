import { useState, useRef, useEffect } from "react";
import { 
  Menu, 
  History, 
  Download, 
  Upload, 
  Settings, 
  HelpCircle,
  FolderOpen,
  FileText
} from "lucide-react";
import { Command } from "@tauri-apps/plugin-shell";
import { mkdir } from "@tauri-apps/plugin-fs";
import { appDataDir } from "@tauri-apps/api/path";
import { exportData, importData } from "../services/importExportService";
import { useSettingsStore } from "../state/settingsStore";
import "./AppMenu.css";

interface AppMenuProps {
  onOpenHistory: () => void;
  onOpenSummaries: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
}

export function AppMenu({ onOpenHistory, onOpenSummaries, onOpenSettings, onOpenAbout }: AppMenuProps) {
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
      // Open folder in Windows Explorer using process plugin
      const command = Command.create("explorer", [dataDir]);
      await command.execute();
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to open data folder:", error);
    }
  };

  const openSummariesFolder = async () => {
    try {
      let summariesPath = getSetting<string>("summaryDestinationFolder");
      
      // If no custom path is set, use a summaries subdirectory in app data
      if (!summariesPath || summariesPath === "") {
        const dataDir = await appDataDir();
        summariesPath = `${dataDir}summaries`;
      }
      
      // Create the folder if it doesn't exist
      try {
        await mkdir(summariesPath, { recursive: true });
      } catch (e) {
        // Folder might already exist, that's fine
      }
      
      // Open folder in Windows Explorer using process plugin
      const command = Command.create("explorer", [summariesPath]);
      await command.execute();
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
          </div>

          <div className="menu-divider" />

          {/* Help Section */}
          <div className="menu-section">
            <button 
              className="menu-item"
              onClick={() => {
                onOpenAbout();
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