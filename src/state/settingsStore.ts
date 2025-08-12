import { create } from "zustand";
import { getAllSettings, setSetting } from "../services/settingsService";

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
      await setSetting(key as any, value);
      const settings = { ...get().settings, [key]: value };
      set({ settings });
      
      // If theme-related setting changed, update theme store
      if (key === "themeMode" || key === "theme") {
        const { applyThemeMode } = await import("./themeStore");
        applyThemeMode(value);
      }
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