import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "../types/task";
import { DateTime } from "luxon";
import { useState } from "react";
import { ContextMenu } from "./ContextMenu";
import { useTaskStore } from "../state/taskStore";
import { Forward, Edit2, Trash2 } from "lucide-react";
import "./TaskItem.css";

interface TaskItemProps {
  task: Task;
  onToggle?: () => void;
  isDragging?: boolean;
  onEdit?: () => void;
}

export function TaskItem({ task, onToggle, isDragging, onEdit }: TaskItemProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const { updateTask, deleteTask } = useTaskStore();
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
  
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleMoveTask = () => {
    const newList = task.list === "TODAY" ? "FUTURE" : "TODAY";
    updateTask(task.id, { list: newList });
  };

  const handleDelete = () => {
    deleteTask(task.id);
  };

  const contextMenuItems = [
    {
      label: task.list === "TODAY" ? "Move to Future" : "Move to Today",
      onClick: handleMoveTask,
      icon: Forward,
    },
    {
      label: "Edit",
      onClick: () => onEdit?.(),
      icon: Edit2,
    },
    {
      label: "Delete",
      onClick: handleDelete,
      icon: Trash2,
      className: "danger",
    },
  ];

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`task-item ${task.completed ? "completed" : ""}`}
        onContextMenu={handleContextMenu}
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
      {contextMenu && (
        <ContextMenu
          items={contextMenuItems}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}