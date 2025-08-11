import { useState, KeyboardEvent } from "react";
import { DateTime } from "luxon";
import { useTaskStore } from "../state/taskStore";
import { TaskList } from "../types/task";
import "./AddTaskInput.css";

interface AddTaskInputProps {
  list: TaskList;
}

export function AddTaskInput({ list }: AddTaskInputProps) {
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const { createTask } = useTaskStore();
  
  const parseTimeFromInput = (text: string): { title: string; scheduledAt?: string } => {
    // Simple time parsing - look for patterns like "3pm", "15:30", "3:30pm"
    const timePatterns = [
      /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
      /(\d{1,2})\s*(am|pm)/i,
    ];
    
    let title = text;
    let scheduledAt: string | undefined;
    
    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        const timeStr = match[0];
        title = text.replace(timeStr, "").trim();
        
        try {
          // Parse the time
          const now = DateTime.local();
          let hour = parseInt(match[1]);
          const minute = match[2] && !isNaN(parseInt(match[2])) ? parseInt(match[2]) : 0;
          const meridiem = match[match.length - 1]?.toLowerCase();
          
          // Check if meridiem is actually am/pm
          if (meridiem === "pm" && hour < 12) hour += 12;
          else if (meridiem === "am" && hour === 12) hour = 0;
          else if (!["am", "pm"].includes(meridiem) && match[2]) {
            // If no am/pm and we have minutes, parse as 24-hour time
            // No adjustment needed
          }
          
          // Validate hour and minute
          if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            return { title: text, scheduledAt: undefined };
          }
          
          let taskTime = now.set({ hour, minute, second: 0, millisecond: 0 });
          
          // If time is in the past today, assume tomorrow
          if (taskTime < now) {
            taskTime = taskTime.plus({ days: 1 });
          }
          
          scheduledAt = taskTime.toISO() || undefined;
        } catch (error) {
          console.error("Error parsing time:", error);
          return { title: text, scheduledAt: undefined };
        }
        break;
      }
    }
    
    return { title, scheduledAt };
  };
  
  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    
    const { title, scheduledAt } = parseTimeFromInput(trimmed);
    
    await createTask({
      title,
      list,
      scheduledAt,
    });
    
    setInput("");
    setIsExpanded(false);
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setInput("");
      setIsExpanded(false);
    }
  };
  
  return (
    <div className={`add-task-input ${isExpanded ? "expanded" : ""}`}>
      <input
        type="text"
        placeholder={`Add task to ${list.toLowerCase()}... (e.g., "Meeting 3pm")`}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={() => setIsExpanded(true)}
        onBlur={() => {
          if (!input) setIsExpanded(false);
        }}
        onKeyDown={handleKeyDown}
        className="task-input"
      />
      {isExpanded && input && (
        <button
          className="add-button"
          onClick={handleSubmit}
          type="button"
        >
          Add
        </button>
      )}
    </div>
  );
}