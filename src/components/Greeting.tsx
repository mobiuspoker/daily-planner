import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { useThemeStore } from "../state/themeStore";
import "./Greeting.css";

interface GreetingProps {
  onComplete?: () => void;
}

export function Greeting({ onComplete }: GreetingProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const { theme } = useThemeStore();
  
  const getGreeting = () => {
    const hour = DateTime.local().hour;
    
    if (hour >= 5 && hour < 12) {
      return "Good morning ☀️";
    } else if (hour >= 12 && hour < 18) {
      return "Good afternoon 🌤️";
    } else if (hour >= 18 && hour < 20) {
      return "Good evening 🌅";
    } else {
      return "Good evening 🌙";
    }
  };
  
  useEffect(() => {
    // Start fade out after 800ms
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 800);
    
    // Call onComplete after fade out completes
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, 1300);
    
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