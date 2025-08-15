import { getDatabase } from "../db/database";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { getAllSettings, setSetting } from "./settingsService";
import { useTaskStore } from "../state/taskStore";
import { DateTime } from "luxon";
import { listRules } from "./recurringTaskService";

interface ExportData {
  version: number;
  exportedAt: string;
  tasks: any[];
  taskHistory: any[];
  settings: Record<string, any>;
  recurringRules?: any[];
}

function normalizeBooleanToInt(value: any): number {
  if (typeof value === "number") {
    return value === 1 ? 1 : 0;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "1" || v === "true" || v === "yes" || v === "y" || v === "on") {
      return 1;
    }
  }
  return 0;
}

function normalizeList(value: any): "TODAY" | "FUTURE" {
  if (typeof value === "string") {
    const up = value.trim().toUpperCase();
    if (up === "TODAY" || up === "FUTURE") return up as any;
  }
  return "TODAY";
}

export async function exportData(): Promise<void> {
  try {
    const db = getDatabase();
    
    // Get all active tasks
    const tasks = await db.select<any[]>("SELECT * FROM tasks ORDER BY list, sort_index");
    
    // Get all history
    const taskHistory = await db.select<any[]>("SELECT * FROM task_history ORDER BY cleared_on DESC");
    
    // Get all recurring rules
    const recurringRules = await listRules();
    
    // Get all settings, but exclude themeMode since it's stored in localStorage
    const allSettings = await getAllSettings();
    const { themeMode, theme, ...settings } = allSettings;
    
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
      recurringRules: recurringRules.map(rule => ({
        id: rule.id,
        title: rule.title,
        notes: rule.notes,
        cadenceType: rule.cadenceType,
        weekdaysMask: rule.weekdaysMask,
        monthlyDay: rule.monthlyDay,
        timeHHmm: rule.timeHHmm,
        enabled: rule.enabled,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt
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
    
    // Import settings (skip themeMode and theme since they're handled locally)
    if (data.settings) {
      for (const [key, value] of Object.entries(data.settings)) {
        if (key === "themeMode" || key === "theme") {
          continue; // Skip theme settings - they're stored in localStorage
        }
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
        
        if ((existing as any[]).length === 0) {
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
        
        if ((existing as any[]).length === 0) {
          const list = normalizeList(task.list);
          const hasTime = normalizeBooleanToInt(task.hasTime);
          const completed = normalizeBooleanToInt(task.completed);
          const sortIndex = typeof task.sortIndex === "number" ? task.sortIndex : Number(task.sortIndex) || 0;
          await db.execute(
            `INSERT INTO tasks (id, title, notes, list, sort_index, has_time, scheduled_at, completed, completed_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              task.id,
              task.title,
              task.notes,
              list,
              sortIndex,
              hasTime,
              task.scheduledAt,
              completed,
              task.completedAt,
              task.createdAt,
              task.updatedAt
            ]
          );
        }
      }
    }
    
    // Import recurring rules (merge strategy)
    if (data.recurringRules && data.recurringRules.length > 0) {
      for (const rule of data.recurringRules) {
        // Check if rule already exists
        const existing = await db.select(
          "SELECT id FROM recurring_rules WHERE id = ?",
          [rule.id]
        );
        
        if ((existing as any[]).length === 0) {
          const enabled = normalizeBooleanToInt(rule.enabled);
          await db.execute(
            `INSERT INTO recurring_rules (id, title, notes, cadence_type, weekdays_mask, monthly_day, time_hhmm, enabled, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              rule.id,
              rule.title,
              rule.notes,
              rule.cadenceType,
              rule.weekdaysMask ?? null,
              rule.monthlyDay ?? null,
              rule.timeHHmm || null,
              enabled,
              rule.createdAt,
              rule.updatedAt
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