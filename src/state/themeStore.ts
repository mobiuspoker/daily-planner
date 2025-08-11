import { create } from "zustand";
import { getSetting, setSetting } from "../services/settingsService";

type Theme = "light" | "dark";
type ThemeMode = "auto" | "light" | "dark";

interface ThemeStore {
  theme: Theme;
  themeMode: ThemeMode;
  initTheme: () => Promise<void>;
  toggleTheme: () => Promise<void>;
  setTheme: (theme: Theme) => void;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: "light",
  themeMode: "auto",
  
  initTheme: async () => {
    try {
      // Get saved theme mode from settings
      const savedMode = await getSetting<ThemeMode>("themeMode") || "auto";
      set({ themeMode: savedMode });
      
      let theme: Theme;
      if (savedMode === "auto") {
        // Check system preference
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        theme = prefersDark ? "dark" : "light";
        
        // Listen for system theme changes
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
          if (get().themeMode === "auto") {
            const newTheme = e.matches ? "dark" : "light";
            set({ theme: newTheme });
            document.documentElement.setAttribute("data-theme", newTheme);
          }
        });
      } else {
        theme = savedMode as Theme;
      }
      
      set({ theme });
      document.documentElement.setAttribute("data-theme", theme);
    } catch (error) {
      console.error("Failed to initialize theme:", error);
      // Fallback to system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme = prefersDark ? "dark" : "light";
      set({ theme, themeMode: "auto" });
      document.documentElement.setAttribute("data-theme", theme);
    }
  },
  
  toggleTheme: async () => {
    const state = get();
    const newTheme = state.theme === "light" ? "dark" : "light";
    const newMode: ThemeMode = newTheme;
    
    set({ theme: newTheme, themeMode: newMode });
    document.documentElement.setAttribute("data-theme", newTheme);
    
    try {
      await setSetting("themeMode", newMode);
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  },
  
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.setAttribute("data-theme", theme);
  },
  
  setThemeMode: async (mode: ThemeMode) => {
    set({ themeMode: mode });
    
    let theme: Theme;
    if (mode === "auto") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      theme = prefersDark ? "dark" : "light";
    } else {
      theme = mode as Theme;
    }
    
    set({ theme });
    document.documentElement.setAttribute("data-theme", theme);
    
    try {
      await setSetting("themeMode", mode);
    } catch (error) {
      console.error("Failed to save theme mode:", error);
    }
  }
}));

// Export helper function for external use
export function applyThemeMode(mode: ThemeMode) {
  useThemeStore.getState().setThemeMode(mode);
}