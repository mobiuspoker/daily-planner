import { useEffect, useState, useMemo } from "react";
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
import { TaskEditModal } from "../components/TaskEditModal";
import { useTaskStore } from "../state/taskStore";
import { Task, TaskList as TaskListType } from "../types/task";
import "./UnifiedTaskList.css";

export function UnifiedTaskList() {
  const { tasks, reorderTasks, toggleTask, moveTask, updateTask } = useTaskStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const todayTasks = useMemo(() => {
    return tasks
      .filter(task => task.list === "TODAY")
      .sort((a, b) => a.sortIndex - b.sortIndex);
  }, [tasks]);
  
  const futureTasks = useMemo(() => {
    return tasks
      .filter(task => task.list === "FUTURE")
      .sort((a, b) => a.sortIndex - b.sortIndex);
  }, [tasks]);
  
  const allTasks = useMemo(() => {
    return [...todayTasks, ...futureTasks];
  }, [todayTasks, futureTasks]);
  
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const activeTask = tasks.find(t => t.id === active.id);
      const overTask = tasks.find(t => t.id === over.id);
      
      if (activeTask && overTask) {
        // If moving between lists
        if (activeTask.list !== overTask.list) {
          await moveTask(active.id as string, overTask.list);
        }
        
        // Reorder within the same list
        const targetList = overTask.list;
        const listTasks = tasks.filter(t => t.list === targetList);
        const newIndex = listTasks.findIndex(t => t.id === over.id);
        
        if (newIndex !== -1) {
          await reorderTasks(active.id as string, newIndex);
        }
      }
    }
    
    setActiveId(null);
  };
  
  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;
  
  return (
    <div className="unified-task-list">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="unified-task-list-content">
          {/* Today Section */}
          <div className="task-section">
            <div className="section-header">
              <h3>Today</h3>
              <span className="section-count">{todayTasks.length}</span>
            </div>
            <AddTaskInput list="TODAY" />
            <div className="section-tasks">
              <SortableContext
                items={todayTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {todayTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTask(task.id)}
                    onEdit={() => setEditingTaskId(task.id)}
                  />
                ))}
              </SortableContext>
            </div>
          </div>
          
          {/* Future Section */}
          <div className="task-section">
            <div className="section-header">
              <h3>Future</h3>
              <span className="section-count">{futureTasks.length}</span>
            </div>
            <AddTaskInput list="FUTURE" />
            <div className="section-tasks">
              <SortableContext
                items={futureTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {futureTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTask(task.id)}
                    onEdit={() => setEditingTaskId(task.id)}
                  />
                ))}
              </SortableContext>
            </div>
          </div>
        </div>
        
        <DragOverlay>
          {activeTask ? (
            <TaskItem task={activeTask} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>
      
      {editingTaskId && (
        <TaskEditModal
          task={tasks.find(t => t.id === editingTaskId)!}
          isOpen={true}
          onClose={() => setEditingTaskId(null)}
        />
      )}
    </div>
  );
}