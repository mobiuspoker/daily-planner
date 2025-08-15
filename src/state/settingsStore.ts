import { create } from "zustand";
import { getAllSettings, setSetting } from "../services/settingsService";
import { applyThemeMode } from "./themeStore";

interface SettingsStore {
  settings: Record<string, any>;
  loading: boolean;
  error: string | null;
  
  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: any) => Promise<void>;
  getSetting: <T = any>(key: string) => T | undefined;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: {},
  loading: false,
  error: null,
  
  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await getAllSettings();
      set({ settings, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : "Failed to load settings",
        loading: false 
      });
    }
  },
  
  updateSetting: async (key: string, value: any) => {
    try {
      // Handle theme in-memory only; skip DB persistence
      if (key === "themeMode" || key === "theme") {
        const settings = { ...get().settings, [key]: value };
        set({ settings });
        applyThemeMode(value);
        try { localStorage.setItem("themeMode", value); } catch {}
        return;
      }

      // Persist other settings to DB
      await setSetting(key as any, value);
      const settings = { ...get().settings, [key]: value };
      set({ settings });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : "Failed to update setting"
      });
    }
  },
  
  getSetting: <T = any>(key: string): T | undefined => {
    return get().settings[key] as T;
  }
}));