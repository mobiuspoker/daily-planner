import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "../types/task";
import { DateTime } from "luxon";
import "./TaskItem.css";

interface TaskItemProps {
  task: Task;
  onToggle?: () => void;
  isDragging?: boolean;
}

export function TaskItem({ task, onToggle, isDragging }: TaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };
  
  const renderTime = () => {
    if (!task.scheduledAt) return null;
    
    const time = DateTime.fromISO(task.scheduledAt);
    const now = DateTime.local();
    const diff = time.diff(now, "minutes").minutes;
    
    let className = "task-time";
    if (diff < 0) {
      className += " overdue";
    } else if (diff < 60) {
      className += " soon";
    }
    
    return (
      <span className={className}>
        {time.toFormat("h:mm a")}
      </span>
    );
  };
  
  if (isDragging) {
    return (
      <div className="task-item dragging">
        <div className="task-content">
          <span className="task-title">{task.title}</span>
          {renderTime()}
        </div>
      </div>
    );
  }
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-item ${task.completed ? "completed" : ""}`}
    >
      <button
        className="task-checkbox"
        onClick={onToggle}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
      >
        {task.completed && "✓"}
      </button>
      
      <div className="task-content">
        <span className="task-title">{task.title}</span>
        {task.notes && <span className="task-notes">{task.notes}</span>}
        {renderTime()}
      </div>
      
      {!task.completed && (
        <div
          className="drag-handle"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </div>
      )}
    </div>
  );
}