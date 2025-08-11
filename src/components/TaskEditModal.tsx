import { useState, useEffect, useRef } from "react";
import { Task } from "../types/task";
import { useTaskStore } from "../state/taskStore";
import "./TaskEditModal.css";

interface TaskEditModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskEditModal({ task, isOpen, onClose }: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title);
  const titleRef = useRef<HTMLInputElement>(null);
  const { updateTask } = useTaskStore();

  useEffect(() => {
    if (isOpen && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [isOpen]);

  useEffect(() => {
    setTitle(task.title);
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      await updateTask(task.id, {
        title: title.trim(),
      });
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="task-edit-overlay" onClick={onClose}>
      <div className="task-edit-modal" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="task-edit-header">
            <h3>Edit Task</h3>
            <button type="button" className="close-button" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="task-edit-content">
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Task title..."
              className="task-edit-input"
            />
          </div>
          <div className="task-edit-footer">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={!title.trim()}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}