import { create } from "zustand";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { UnlistenFn } from "@tauri-apps/api/event";

type Theme = "light" | "dark";
type ThemeMode = "auto" | "light" | "dark";

interface ThemeStore {
  theme: Theme;
  themeMode: ThemeMode;
  unlistener: UnlistenFn | null;
  initTheme: () => Promise<void>;
  toggleTheme: () => Promise<void>;
  setTheme: (theme: Theme) => void;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  cleanup: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: "light",
  themeMode: "auto",
  unlistener: null,
  
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

    // Try to use Tauri's native theme detection first
    let bootTheme: Theme = "light";
    try {
      const appWindow = getCurrentWindow();
      const tauriTheme = await appWindow.theme();
      if (bootMode === "auto") {
        bootTheme = tauriTheme || "light";
      } else {
        bootTheme = bootMode as Theme;
      }
      
      // Listen for Tauri theme changes
      const unlistener = await appWindow.onThemeChanged(({ payload: theme }) => {
        if (get().themeMode === "auto" && theme) {
          set({ theme });
          document.documentElement.setAttribute("data-theme", theme);
        }
      });
      set({ unlistener });
    } catch {
      // Fallback to browser API if Tauri is not available
      const prefersDarkMql = window.matchMedia("(prefers-color-scheme: dark)");
      const prefersDark = prefersDarkMql.matches;
      bootTheme = bootMode === "auto" ? (prefersDark ? "dark" : "light") : (bootMode as Theme);
      
      // Listen for system theme changes while in auto mode
      const onSystemThemeChange = (e: MediaQueryListEvent) => {
        if (get().themeMode === "auto") {
          const newTheme = e.matches ? "dark" : "light";
          set({ theme: newTheme });
          document.documentElement.setAttribute("data-theme", newTheme);
        }
      };
      try { prefersDarkMql.addEventListener("change", onSystemThemeChange); } catch {}
    }

    set({ theme: bootTheme });
    document.documentElement.setAttribute("data-theme", bootTheme);
  },
  
  toggleTheme: async () => {
    const state = get();
    const newTheme = state.theme === "light" ? "dark" : "light";
    const newMode: ThemeMode = newTheme;
    
    set({ theme: newTheme, themeMode: newMode });
    document.documentElement.setAttribute("data-theme", newTheme);
    try { localStorage.setItem("themeMode", newTheme); } catch {}
    
    // Do not persist to DB; localStorage is sufficient and faster
  },
  
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.setAttribute("data-theme", theme);
  },
  
  setThemeMode: async (mode: ThemeMode) => {
    set({ themeMode: mode });
    
    let theme: Theme;
    if (mode === "auto") {
      // Try Tauri API first
      try {
        const appWindow = getCurrentWindow();
        const tauriTheme = await appWindow.theme();
        theme = tauriTheme || "light";
      } catch {
        // Fallback to browser API
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        theme = prefersDark ? "dark" : "light";
      }
    } else {
      theme = mode as Theme;
    }
    
    set({ theme });
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("themeMode", mode); } catch {}
  },
  
  cleanup: () => {
    const { unlistener } = get();
    if (unlistener) {
      unlistener();
      set({ unlistener: null });
    }
  }
}));

// Export helper function for external use
export function applyThemeMode(mode: ThemeMode) {
  useThemeStore.getState().setThemeMode(mode);
}