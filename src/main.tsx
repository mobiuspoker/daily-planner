import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

// Apply theme immediately to prevent flash
(async () => {
  try {
    const savedTheme = localStorage.getItem("themeMode");
    if (savedTheme && savedTheme !== "auto") {
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    }
  } catch {
    // Fallback to light theme if localStorage is not available
    document.documentElement.setAttribute("data-theme", "light");
  }
})();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);