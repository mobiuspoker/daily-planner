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
    // Fast bootstrap: use localStorage or system preference without waiting on DB
    let bootMode: ThemeMode = "auto";
    try {
      const stored = localStorage.getItem("themeMode");
      if (stored === "light" || stored === "dark") {
        bootMode = stored;
      }
    } catch {}

    set({ themeMode: bootMode });

    const prefersDarkMql = window.matchMedia("(prefers-color-scheme: dark)");
    const prefersDark = prefersDarkMql.matches;
    const bootTheme: Theme = bootMode === "auto" ? (prefersDark ? "dark" : "light") : (bootMode as Theme);

    set({ theme: bootTheme });
    document.documentElement.setAttribute("data-theme", bootTheme);

    // Listen for system theme changes while in auto mode
    const onSystemThemeChange = (e: MediaQueryListEvent) => {
      if (get().themeMode === "auto") {
        const newTheme = e.matches ? "dark" : "light";
        set({ theme: newTheme });
        document.documentElement.setAttribute("data-theme", newTheme);
      }
    };
    try { prefersDarkMql.addEventListener("change", onSystemThemeChange); } catch {}

    // Reconcile with persisted setting asynchronously (may require DB)
    try {
      const savedMode = await getSetting<ThemeMode>("themeMode");
      // Only enforce a persisted explicit choice; ignore implicit default 'auto'
      if (savedMode === "light" || savedMode === "dark") {
        if (savedMode !== bootMode) {
          await get().setThemeMode(savedMode);
        }
      }
    } catch (error) {
      console.error("Failed to reconcile theme from settings:", error);
    }
  },
  
  toggleTheme: async () => {
    const state = get();
    const newTheme = state.theme === "light" ? "dark" : "light";
    const newMode: ThemeMode = newTheme;
    
    set({ theme: newTheme, themeMode: newMode });
    document.documentElement.setAttribute("data-theme", newTheme);
    try { localStorage.setItem("themeMode", newTheme); } catch {}
    
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
      if (mode === "auto") {
        // Persist explicit auto so we can restore on next run without DB
        localStorage.setItem("themeMode", "auto");
      } else {
        localStorage.setItem("themeMode", theme);
      }
    } catch {}
    
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