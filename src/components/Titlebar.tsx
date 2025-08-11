import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import "./Titlebar.css";

export function Titlebar() {
  const appWindow = getCurrentWindow();
  
  const handleMinimize = () => {
    appWindow.minimize();
  };

  const handleMaximize = () => {
    appWindow.toggleMaximize();
  };

  const handleClose = () => {
    appWindow.close();
  };

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-title" data-tauri-drag-region>
        Task Planner
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