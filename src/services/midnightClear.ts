import { DateTime } from "luxon";
import { getDatabase } from "../db/database";
import { useTaskStore } from "../state/taskStore";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { generateForDate } from "./recurringTaskService";

let midnightTimeout: number | null = null;

export async function setupMidnightClear() {
  // Schedule the next midnight clear
  scheduleNextMidnightClear();
}

function scheduleNextMidnightClear() {
  // Cancel any existing timeout
  if (midnightTimeout) {
    clearTimeout(midnightTimeout);
  }
  
  // Calculate time until next midnight
  const now = DateTime.local();
  const midnight = now.plus({ days: 1 }).startOf("day");
  const msUntilMidnight = midnight.diff(now).milliseconds;
  
  console.log(`Scheduling midnight clear in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
  
  // Schedule the clear
  midnightTimeout = setTimeout(async () => {
    await performMidnightClear();
    // Schedule the next one
    scheduleNextMidnightClear();
  }, msUntilMidnight);
}

async function performMidnightClear() {
  try {
    const db = getDatabase();
    const now = DateTime.utc().toISO();
    const today = DateTime.local().toISODate();
    
    // Get completed tasks from both lists
    // Be resilient to imported data where boolean fields might be stored as strings
    const completedTodayTasks = await db.select<any[]>(
      "SELECT * FROM tasks WHERE upper(list) = 'TODAY' AND (completed = 1 OR completed = '1' OR lower(completed) = 'true')"
    );
    
    const completedFutureTasks = await db.select<any[]>(
      "SELECT * FROM tasks WHERE upper(list) = 'FUTURE' AND (completed = 1 OR completed = '1' OR lower(completed) = 'true')"
    );
    
    // Get incomplete tasks count for logging
    const incompleteTasks = await db.select<any[]>(
      "SELECT * FROM tasks WHERE upper(list) = 'TODAY' AND (completed = 0 OR completed = '0' OR lower(completed) = 'false' OR completed IS NULL)"
    );
    
    const totalCompleted = completedTodayTasks.length + completedFutureTasks.length;
    console.log(`Midnight clear: Archiving ${completedTodayTasks.length} Today + ${completedFutureTasks.length} Future completed tasks, keeping ${incompleteTasks.length} incomplete tasks in Today`);
    
    // Process completed TODAY tasks
    for (const task of completedTodayTasks) {
      // Use the task's completion date as the cleared_on date
      const clearedOn = task.completed_at
        ? DateTime.fromISO(task.completed_at).toLocal().toISODate()
        : today;
      
      // Archive to history with source list
      await db.execute(
        `INSERT INTO task_history (id, source_list, title, completed_at, cleared_on, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          "TODAY", 
          task.title,
          task.completed_at,
          clearedOn!,
          now!
        ]
      );
      
      // Delete the completed task
      await db.execute(
        "DELETE FROM tasks WHERE id = ?",
        [task.id]
      );
    }
    
    // Process completed FUTURE tasks
    for (const task of completedFutureTasks) {
      // Use the task's completion date as the cleared_on date
      const clearedOn = task.completed_at
        ? DateTime.fromISO(task.completed_at).toLocal().toISODate()
        : today;
      
      // Archive to history with source list
      await db.execute(
        `INSERT INTO task_history (id, source_list, title, completed_at, cleared_on, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          "FUTURE", 
          task.title,
          task.completed_at,
          clearedOn!,
          now!
        ]
      );
      
      // Delete the completed task
      await db.execute(
        "DELETE FROM tasks WHERE id = ?",
        [task.id]
      );
    }
    
    // Generate recurring tasks for the new day
    const { created: recurringCreated } = await generateForDate(DateTime.local());
    
    // Reload tasks in the store
    await useTaskStore.getState().loadTasks();
    
    // Send notification
    let notificationBody = `Archived ${totalCompleted} completed task${totalCompleted === 1 ? '' : 's'} (${completedTodayTasks.length} Today, ${completedFutureTasks.length} Future). ${incompleteTasks.length} task${incompleteTasks.length === 1 ? '' : 's'} carried over.`;
    if (recurringCreated > 0) {
      notificationBody += ` Added ${recurringCreated} recurring task${recurringCreated === 1 ? '' : 's'}.`;
    }
    
    if (totalCompleted > 0 || incompleteTasks.length > 0 || recurringCreated > 0) {
      await sendNotification({
        title: "Daily Clear Complete",
        body: notificationBody,
      });
    }
    
    console.log("Midnight clear completed successfully");
  } catch (error) {
    console.error("Failed to perform midnight clear:", error);
    await sendNotification({
      title: "Daily Clear Failed",
      body: "There was an error clearing today's tasks. Please check the app.",
    });
  }
}

export function stopMidnightClear() {
  if (midnightTimeout) {
    clearTimeout(midnightTimeout);
    midnightTimeout = null;
  }
}

// Allow manual trigger for testing
export async function triggerMidnightClear() {
  // Add a small delay to avoid conflicts with ongoing operations
  setTimeout(async () => {
    try {
      await performMidnightClear();
    } catch (error: any) {
      if (error?.message?.includes('database is locked')) {
        console.log("Database busy, retrying in 1 second...");
        setTimeout(() => performMidnightClear(), 1000);
      } else {
        throw error;
      }
    }
  }, 100);
}

// Alias for menu action
export async function runMidnightClear() {
  return triggerMidnightClear();
}