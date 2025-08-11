import { getDatabase } from "../db/database";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { getAllSettings, setSetting, deleteAllSettings } from "./settingsService";
import { useTaskStore } from "../state/taskStore";
import { DateTime } from "luxon";

interface ExportData {
  version: number;
  exportedAt: string;
  tasks: any[];
  taskHistory: any[];
  settings: Record<string, any>;
}

export async function exportData(): Promise<void> {
  try {
    const db = getDatabase();
    
    // Get all active tasks
    const tasks = await db.select<any[]>("SELECT * FROM tasks ORDER BY list, sort_index");
    
    // Get all history
    const taskHistory = await db.select<any[]>("SELECT * FROM task_history ORDER BY cleared_on DESC");
    
    // Get all settings
    const settings = await getAllSettings();
    
    // Create export object
    const exportData: ExportData = {
      version: 1,
      exportedAt: DateTime.utc().toISO()!,
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        notes: task.notes,
        list: task.list,
        sortIndex: task.sort_index,
        hasTime: task.has_time,
        scheduledAt: task.scheduled_at,
        completed: task.completed,
        completedAt: task.completed_at,
        createdAt: task.created_at,
        updatedAt: task.updated_at
      })),
      taskHistory: taskHistory.map(item => ({
        id: item.id,
        sourceList: item.source_list,
        title: item.title,
        completedAt: item.completed_at,
        clearedOn: item.cleared_on,
        createdAt: item.created_at
      })),
      settings
    };
    
    // Show save dialog
    const filePath = await save({
      defaultPath: `task-planner-export-${DateTime.local().toFormat("yyyy-MM-dd")}.json`,
      filters: [{
        name: "JSON",
        extensions: ["json"]
      }]
    });
    
    if (filePath) {
      await writeTextFile(filePath, JSON.stringify(exportData, null, 2));
      console.log("Export successful:", filePath);
    }
  } catch (error) {
    console.error("Export failed:", error);
    throw error;
  }
}

export async function importData(): Promise<void> {
  try {
    // Show open dialog
    const selected = await open({
      multiple: false,
      filters: [{
        name: "JSON",
        extensions: ["json"]
      }]
    });
    
    if (!selected) return;
    
    const filePath = Array.isArray(selected) ? selected[0] : selected;
    const content = await readTextFile(filePath);
    const data: ExportData = JSON.parse(content);
    
    // Validate version
    if (data.version !== 1) {
      throw new Error(`Unsupported export version: ${data.version}`);
    }
    
    const db = getDatabase();
    
    // Import settings
    if (data.settings) {
      for (const [key, value] of Object.entries(data.settings)) {
        await setSetting(key as any, value);
      }
    }
    
    // Import task history (append, don't replace)
    if (data.taskHistory && data.taskHistory.length > 0) {
      for (const item of data.taskHistory) {
        // Check if history item already exists
        const existing = await db.select(
          "SELECT id FROM task_history WHERE id = ?",
          [item.id]
        );
        
        if (existing.length === 0) {
          await db.execute(
            `INSERT INTO task_history (id, source_list, title, completed_at, cleared_on, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              item.id,
              item.sourceList,
              item.title,
              item.completedAt,
              item.clearedOn,
              item.createdAt
            ]
          );
        }
      }
    }
    
    // Import active tasks (merge strategy)
    if (data.tasks && data.tasks.length > 0) {
      for (const task of data.tasks) {
        // Check if task already exists
        const existing = await db.select(
          "SELECT id FROM tasks WHERE id = ?",
          [task.id]
        );
        
        if (existing.length === 0) {
          await db.execute(
            `INSERT INTO tasks (id, title, notes, list, sort_index, has_time, scheduled_at, completed, completed_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              task.id,
              task.title,
              task.notes,
              task.list,
              task.sortIndex,
              task.hasTime,
              task.scheduledAt,
              task.completed,
              task.completedAt,
              task.createdAt,
              task.updatedAt
            ]
          );
        }
      }
    }
    
    // Reload tasks in the store
    await useTaskStore.getState().loadTasks();
    
    console.log("Import successful");
  } catch (error) {
    console.error("Import failed:", error);
    throw error;
  }
}