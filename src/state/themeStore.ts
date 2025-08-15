import { create } from "zustand";

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

    // No DB reconciliation; localStorage is the source of truth at startup
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
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      theme = prefersDark ? "dark" : "light";
    } else {
      theme = mode as Theme;
    }
    
    set({ theme });
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("themeMode", mode); } catch {}
    // Do not persist to DB; avoid async I/O at boot and race conditions
  }
}));

// Export helper function for external use
export function applyThemeMode(mode: ThemeMode) {
  useThemeStore.getState().setThemeMode(mode);
}