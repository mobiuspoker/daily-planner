import { useState, useEffect } from "react";
import { X, Clock, Bell, Moon, Sun, Monitor } from "lucide-react";
import { useThemeStore } from "../state/themeStore";
import { useSettingsStore } from "../state/settingsStore";
import { CustomDropdown } from "./CustomDropdown";
import "./SettingsModal.css";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { themeMode, setThemeMode } = useThemeStore();
  const { updateSetting, getSetting } = useSettingsStore();
  const [reminderLead, setReminderLead] = useState(15);
  const [overdueWindow, setOverdueWindow] = useState(60);

  useEffect(() => {
    if (isOpen) {
      const lead = getSetting<number>("reminderLeadMinutes") || 15;
      const overdue = getSetting<number>("overdueWindowMinutes") || 60;
      setReminderLead(lead);
      setOverdueWindow(overdue);
    }
  }, [isOpen, getSetting]);

  const handleReminderLeadChange = async (minutes: number) => {
    setReminderLead(minutes);
    await updateSetting("reminderLeadMinutes", minutes);
  };

  const handleOverdueWindowChange = async (minutes: number) => {
    setOverdueWindow(minutes);
    await updateSetting("overdueWindowMinutes", minutes);
  };

  const handleThemeChange = async (mode: "auto" | "light" | "dark") => {
    await setThemeMode(mode);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        <div className="settings-content">
          {/* Theme Section */}
          <div className="settings-section">
            <h3>Appearance</h3>
            <div className="setting-item">
              <label>Theme</label>
              <div className="theme-options">
                <button
                  className={`theme-option ${themeMode === "auto" ? "active" : ""}`}
                  onClick={() => handleThemeChange("auto")}
                >
                  <Monitor size={18} />
                  <span>Auto</span>
                </button>
                <button
                  className={`theme-option ${themeMode === "light" ? "active" : ""}`}
                  onClick={() => handleThemeChange("light")}
                >
                  <Sun size={18} />
                  <span>Light</span>
                </button>
                <button
                  className={`theme-option ${themeMode === "dark" ? "active" : ""}`}
                  onClick={() => handleThemeChange("dark")}
                >
                  <Moon size={18} />
                  <span>Dark</span>
                </button>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="settings-section">
            <h3>Notifications</h3>
            <div className="setting-item">
              <label htmlFor="reminder-lead">
                <Clock size={16} />
                Reminder Lead Time
              </label>
              <CustomDropdown
                id="reminder-lead"
                value={reminderLead}
                options={[
                  { value: 5, label: "5 minutes" },
                  { value: 10, label: "10 minutes" },
                  { value: 15, label: "15 minutes" },
                  { value: 30, label: "30 minutes" },
                  { value: 60, label: "1 hour" }
                ]}
                onChange={(value) => handleReminderLeadChange(value as number)}
              />
            </div>

            <div className="setting-item">
              <label htmlFor="overdue-window">
                <Bell size={16} />
                Overdue Alert Window
              </label>
              <CustomDropdown
                id="overdue-window"
                value={overdueWindow}
                options={[
                  { value: 30, label: "30 minutes" },
                  { value: 60, label: "1 hour" },
                  { value: 120, label: "2 hours" },
                  { value: 240, label: "4 hours" },
                  { value: 480, label: "8 hours" }
                ]}
                onChange={(value) => handleOverdueWindowChange(value as number)}
              />
            </div>
            
            <div className="setting-description">
              <p>• Reminders are sent before a task is due</p>
              <p>• Overdue alerts are sent after a task's scheduled time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}