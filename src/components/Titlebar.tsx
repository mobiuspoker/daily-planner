import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import iconPath from "../assets/icon.png";
import { useEffect, useState } from "react";
import { platform } from "@tauri-apps/plugin-os";
import "./Titlebar.css";

export function Titlebar() {
  const appWindow = getCurrentWindow();
  const [isMac, setIsMac] = useState(false);
  
  useEffect(() => {
    async function checkPlatform() {
      const p = await platform();
      setIsMac(p === 'macos');
    }
    checkPlatform();
  }, []);
  
  const handleMinimize = () => {
    appWindow.minimize();
  };

  const handleMaximize = () => {
    appWindow.toggleMaximize();
  };

  const handleClose = () => {
    appWindow.close();
  };

  // Don't show custom titlebar on macOS
  if (isMac) return null;
  
  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-title" data-tauri-drag-region>
        <img src={iconPath} alt="Daily Planner" className="titlebar-icon" />
        <span>Daily Planner</span>
      </div>
      <div className="titlebar-controls">
        <button
          className="titlebar-button"
          onClick={handleMinimize}
          aria-label="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          className="titlebar-button"
          onClick={handleMaximize}
          aria-label="Maximize"
        >
          <Square size={12} />
        </button>
        <button
          className="titlebar-button titlebar-button-close"
          onClick={handleClose}
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}