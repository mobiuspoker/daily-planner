import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { DateTime } from "luxon";
import { useTaskStore } from "../state/taskStore";
import { TaskList } from "../types/task";
import "./QuickAddModal.css";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const [input, setInput] = useState("");
  const [selectedList, setSelectedList] = useState<TaskList>("TODAY");
  const inputRef = useRef<HTMLInputElement>(null);
  const { createTask } = useTaskStore();
  
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setInput("");
    }
  }, [isOpen]);
  
  const parseTimeFromInput = (text: string): { title: string; scheduledAt?: string } => {
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
          const now = DateTime.local();
          let hour = parseInt(match[1]);
          const minute = match[2] && !isNaN(parseInt(match[2])) ? parseInt(match[2]) : 0;
          const meridiem = match[match.length - 1]?.toLowerCase();
          
          if (meridiem === "pm" && hour < 12) hour += 12;
          else if (meridiem === "am" && hour === 12) hour = 0;
          
          if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            return { title: text, scheduledAt: undefined };
          }
          
          let taskTime = now.set({ hour, minute, second: 0, millisecond: 0 });
          
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
      list: selectedList,
      scheduledAt,
    });
    
    setInput("");
    onClose();
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setInput("");
      onClose();
    } else if (e.key === "Tab") {
      e.preventDefault();
      setSelectedList(selectedList === "TODAY" ? "FUTURE" : "TODAY");
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="quick-add-overlay" onClick={onClose}>
      <div className="quick-add-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quick-add-header">
          <h3>Quick Add Task</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="quick-add-content">
          <input
            ref={inputRef}
            type="text"
            placeholder="Task description... (e.g., 'Meeting 3pm')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="quick-add-input"
          />
          
          <div className="quick-add-options">
            <label className="list-option">
              <input
                type="radio"
                name="list"
                value="TODAY"
                checked={selectedList === "TODAY"}
                onChange={() => setSelectedList("TODAY")}
              />
              <span>Today</span>
            </label>
            <label className="list-option">
              <input
                type="radio"
                name="list"
                value="FUTURE"
                checked={selectedList === "FUTURE"}
                onChange={() => setSelectedList("FUTURE")}
              />
              <span>Future</span>
            </label>
          </div>
          
          <div className="quick-add-footer">
            <span className="shortcut-hint">Tab to switch list • Enter to add • Esc to cancel</span>
            <button 
              className="add-button" 
              onClick={handleSubmit}
              disabled={!input.trim()}
            >
              Add Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}