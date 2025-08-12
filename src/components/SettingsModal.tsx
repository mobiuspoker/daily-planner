import { useState, useEffect } from "react";
import { X, Clock, Bell, Moon, Sun, Monitor, Calendar, FolderOpen, Key } from "lucide-react";
import { useThemeStore } from "../state/themeStore";
import { useSettingsStore } from "../state/settingsStore";
import { CustomDropdown } from "./CustomDropdown";
import { open } from "@tauri-apps/plugin-dialog";
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
  const [summaryWeeklyEnabled, setSummaryWeeklyEnabled] = useState(false);
  const [summaryMonthlyEnabled, setSummaryMonthlyEnabled] = useState(false);
  const [summaryTime, setSummaryTime] = useState("08:00");
  const [summaryFolder, setSummaryFolder] = useState("");
  const [aiProvider, setAiProvider] = useState("none");
  const [aiApiKey, setAiApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const lead = getSetting<number>("reminderLeadMinutes") || 15;
      const overdue = getSetting<number>("overdueWindowMinutes") || 60;
      const weeklyEnabled = getSetting<boolean>("summaryWeeklyEnabled") || false;
      const monthlyEnabled = getSetting<boolean>("summaryMonthlyEnabled") || false;
      const time = getSetting<string>("summaryTime") || "08:00";
      const folder = getSetting<string>("summaryDestinationFolder") || "";
      const provider = getSetting<string>("aiProvider") || "none";
      const key = getSetting<string>("aiApiKey") || "";
      
      setReminderLead(lead);
      setOverdueWindow(overdue);
      setSummaryWeeklyEnabled(weeklyEnabled);
      setSummaryMonthlyEnabled(monthlyEnabled);
      setSummaryTime(time);
      setSummaryFolder(folder);
      setAiProvider(provider);
      setAiApiKey(key);
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

  const handleSummaryWeeklyChange = async (enabled: boolean) => {
    setSummaryWeeklyEnabled(enabled);
    await updateSetting("summaryWeeklyEnabled", enabled);
  };

  const handleSummaryMonthlyChange = async (enabled: boolean) => {
    setSummaryMonthlyEnabled(enabled);
    await updateSetting("summaryMonthlyEnabled", enabled);
  };

  const handleSummaryTimeChange = async (time: string) => {
    setSummaryTime(time);
    await updateSetting("summaryTime", time);
  };

  const handleChooseFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Choose Summary Destination Folder"
    });

    if (selected && typeof selected === "string") {
      setSummaryFolder(selected);
      await updateSetting("summaryDestinationFolder", selected);
    }
  };

  const handleAiProviderChange = async (provider: string) => {
    setAiProvider(provider);
    await updateSetting("aiProvider", provider);
  };

  const handleAiApiKeyChange = async (key: string) => {
    setAiApiKey(key);
    await updateSetting("aiApiKey", key);
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
                  { value: -1, label: "Never" },
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
                  { value: -1, label: "Never" },
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
              <p>Set how early you want reminders, or turn them off.</p>
            </div>
          </div>

          {/* Summaries Section */}
          <div className="settings-section">
            <h3>Summaries</h3>
            <div className="setting-item">
              <label>
                <Calendar size={16} />
                Weekly Summary
              </label>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={summaryWeeklyEnabled}
                  onChange={(e) => handleSummaryWeeklyChange(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <label>
                <Calendar size={16} />
                Monthly Summary
              </label>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={summaryMonthlyEnabled}
                  onChange={(e) => handleSummaryMonthlyChange(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <label htmlFor="summary-time">
                <Clock size={16} />
                Summary Time
              </label>
              <CustomDropdown
                id="summary-time"
                value={summaryTime}
                options={[
                  { value: "06:00", label: "6:00 AM" },
                  { value: "07:00", label: "7:00 AM" },
                  { value: "08:00", label: "8:00 AM" },
                  { value: "09:00", label: "9:00 AM" },
                  { value: "17:00", label: "5:00 PM" },
                  { value: "18:00", label: "6:00 PM" },
                  { value: "19:00", label: "7:00 PM" },
                  { value: "20:00", label: "8:00 PM" }
                ]}
                onChange={(value) => handleSummaryTimeChange(value as string)}
              />
            </div>

            <div className="setting-item">
              <label>
                <FolderOpen size={16} />
                Destination Folder
              </label>
              <button className="folder-button" onClick={handleChooseFolder}>
                {summaryFolder || "Default (App Data)"}
              </button>
            </div>
          </div>

          {/* AI Section */}
          <div className="settings-section">
            <h3>AI Summaries</h3>
            <div className="setting-item">
              <label htmlFor="ai-provider">
                AI Provider
              </label>
              <CustomDropdown
                id="ai-provider"
                value={aiProvider}
                options={[
                  { value: "none", label: "None" },
                  { value: "openai", label: "OpenAI" },
                  { value: "anthropic", label: "Anthropic" }
                ]}
                onChange={(value) => handleAiProviderChange(value as string)}
              />
            </div>

            {aiProvider !== "none" && (
              <div className="setting-item">
                <label htmlFor="ai-api-key">
                  <Key size={16} />
                  API Key
                </label>
                <div className="api-key-input">
                  <input
                    id="ai-api-key"
                    type={showApiKey ? "text" : "password"}
                    value={aiApiKey}
                    onChange={(e) => handleAiApiKeyChange(e.target.value)}
                    placeholder="Enter API key"
                  />
                  <button
                    className="toggle-visibility"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )}

            {aiProvider !== "none" && (
              <div className="setting-description">
                <p>API keys are stored locally and only used to enhance summaries with AI insights.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}