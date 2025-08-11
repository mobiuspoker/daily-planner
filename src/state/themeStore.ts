import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeStore {
  theme: Theme;
  initTheme: () => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: "light",
  
  initTheme: () => {
    // Check system preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const theme = savedTheme || (prefersDark ? "dark" : "light");
    
    set({ theme });
    document.documentElement.setAttribute("data-theme", theme);
    
    // Listen for system theme changes
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!localStorage.getItem("theme")) {
        const newTheme = e.matches ? "dark" : "light";
        set({ theme: newTheme });
        document.documentElement.setAttribute("data-theme", newTheme);
      }
    });
  },
  
  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === "light" ? "dark" : "light";
      localStorage.setItem("theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
      return { theme: newTheme };
    });
  },
  
  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }
}));