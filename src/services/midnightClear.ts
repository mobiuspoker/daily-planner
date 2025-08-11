import { DateTime } from "luxon";
import { getDatabase } from "../db/database";
import { useTaskStore } from "../state/taskStore";
import { sendNotification } from "@tauri-apps/plugin-notification";

let midnightTimeout: NodeJS.Timeout | null = null;

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
    const completedTodayTasks = await db.select<any[]>(
      "SELECT * FROM tasks WHERE list = 'TODAY' AND completed = 1"
    );
    
    const completedFutureTasks = await db.select<any[]>(
      "SELECT * FROM tasks WHERE list = 'FUTURE' AND completed = 1"
    );
    
    // Get incomplete tasks count for logging
    const incompleteTasks = await db.select<any[]>(
      "SELECT * FROM tasks WHERE list = 'TODAY' AND completed = 0"
    );
    
    const totalCompleted = completedTodayTasks.length + completedFutureTasks.length;
    console.log(`Midnight clear: Archiving ${completedTodayTasks.length} Today + ${completedFutureTasks.length} Future completed tasks, keeping ${incompleteTasks.length} incomplete tasks in Today`);
    
    // Process completed TODAY tasks
    for (const task of completedTodayTasks) {
      // Archive to history with source list
      await db.execute(
        `INSERT INTO task_history (id, source_list, title, completed_at, cleared_on, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          "TODAY", 
          task.title,
          task.completed_at,
          today!,
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
      // Archive to history with source list
      await db.execute(
        `INSERT INTO task_history (id, source_list, title, completed_at, cleared_on, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          "FUTURE", 
          task.title,
          task.completed_at,
          today!,
          now!
        ]
      );
      
      // Delete the completed task
      await db.execute(
        "DELETE FROM tasks WHERE id = ?",
        [task.id]
      );
    }
    
    // Reload tasks in the store
    await useTaskStore.getState().loadTasks();
    
    // Send notification
    if (totalCompleted > 0 || incompleteTasks.length > 0) {
      await sendNotification({
        title: "Daily Clear Complete",
        body: `Archived ${totalCompleted} completed task${totalCompleted === 1 ? '' : 's'} (${completedTodayTasks.length} Today, ${completedFutureTasks.length} Future). ${incompleteTasks.length} task${incompleteTasks.length === 1 ? '' : 's'} carried over.`,
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