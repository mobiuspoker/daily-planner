import { create } from "zustand";
import { Task, TaskList, CreateTaskInput, UpdateTaskInput } from "../types/task";
import * as taskService from "../services/taskService";

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  
  loadTasks: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<void>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  reorderTasks: (taskId: string, newIndex: number, targetList?: TaskList) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  
  loadTasks: async () => {
    set({ loading: true, error: null });
    try {
      const tasks = await taskService.getTasks();
      set({ tasks, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  createTask: async (input) => {
    try {
      const newTask = await taskService.createTask(input);
      set(state => ({
        tasks: [...state.tasks, newTask],
        error: null
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  updateTask: async (id, input) => {
    try {
      const updatedTask = await taskService.updateTask(id, input);
      set(state => ({
        tasks: state.tasks.map(task => 
          task.id === id ? updatedTask : task
        ),
        error: null
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  deleteTask: async (id) => {
    try {
      await taskService.deleteTask(id);
      set(state => ({
        tasks: state.tasks.filter(task => task.id !== id),
        error: null
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  reorderTasks: async (taskId, newIndex, targetList) => {
    try {
      await taskService.reorderTasks(taskId, newIndex, targetList);
      await get().loadTasks();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  toggleTask: async (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (task) {
      await get().updateTask(id, { completed: !task.completed });
    }
  }
}));