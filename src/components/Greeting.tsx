import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { useThemeStore } from "../state/themeStore";
import { useSettingsStore } from "../state/settingsStore";
import "./Greeting.css";

interface GreetingProps {
  onComplete?: () => void;
}

export function Greeting({ onComplete }: GreetingProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const { theme } = useThemeStore();
  const { getSetting } = useSettingsStore();
  const userName = getSetting<string>("userName") || "";
  
  const getGreeting = () => {
    const hour = DateTime.local().hour;
    const namePrefix = userName ? `, ${userName}` : "";
    
    if (hour >= 5 && hour < 12) {
      return `Good morning${namePrefix} ☀️`;
    } else if (hour >= 12 && hour < 18) {
      return `Good afternoon${namePrefix} 🌤️`;
    } else if (hour >= 18 && hour < 20) {
      return `Good evening${namePrefix} 🌅`;
    } else {
      return `Good evening${namePrefix} 🌙`;
    }
  };
  
  useEffect(() => {
    // Start fade out after 1000ms
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 1000);
    
    // Call onComplete after fade out completes
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, 1500);
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);
  
  return (
    <div className={`greeting-overlay ${theme} ${fadeOut ? 'fade-out' : ''}`}>
      <h1 className="greeting-text">{getGreeting()}</h1>
    </div>
  );
}