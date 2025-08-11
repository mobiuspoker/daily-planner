import { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TaskItem } from "../components/TaskItem";
import { AddTaskInput } from "../components/AddTaskInput";
import { useTaskStore } from "../state/taskStore";
import { TaskList as TaskListType } from "../types/task";
import "./TaskList.css";

interface TaskListProps {
  type: TaskListType;
}

export function TaskList({ type }: TaskListProps) {
  const { tasks, reorderTasks, toggleTask } = useTaskStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const listTasks = useMemo(() => {
    return tasks
      .filter(task => task.list === type)
      .sort((a, b) => a.sortIndex - b.sortIndex);
  }, [tasks, type]);
  
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = listTasks.findIndex(task => task.id === active.id);
      const newIndex = listTasks.findIndex(task => task.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        await reorderTasks(active.id as string, newIndex);
      }
    }
    
    setActiveId(null);
  };
  
  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;
  
  return (
    <div className="task-list">
      <div className="task-list-header">
        <h2>{type === "TODAY" ? "Today" : "Future"}</h2>
        <span className="task-count">{listTasks.length}</span>
      </div>
      
      <AddTaskInput list={type} />
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="task-list-content">
          <SortableContext
            items={listTasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {listTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => toggleTask(task.id)}
              />
            ))}
          </SortableContext>
        </div>
        
        <DragOverlay>
          {activeTask ? (
            <TaskItem task={activeTask} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}