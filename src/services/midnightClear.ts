import { DateTime } from "luxon";
import { getDatabase } from "../db/database";
import { useTaskStore } from "../state/taskStore";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { generateForDate } from "./recurringTaskService";
import { getSetting, setSetting } from "./settingsService";

let midnightTimeout: number | null = null;

export async function setupMidnightClear() {
  // Check if we missed any midnight clears while the app was closed
  await checkAndPerformMissedClears();
  
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

async function performMidnightClear(clearDate?: DateTime) {
  try {
    const db = getDatabase();
    const now = DateTime.utc().toISO();
    const effectiveDate = clearDate || DateTime.local();
    const today = effectiveDate.toISODate();
    
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
    const { created: recurringCreated } = await generateForDate(effectiveDate);
    
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
    
    // Save the last clear date
    await setSetting('lastMidnightClear', effectiveDate.toISODate());
    
    console.log(`Midnight clear completed successfully for ${effectiveDate.toISODate()}`);
  } catch (error) {
    console.error("Failed to perform midnight clear:", error);
    await sendNotification({
      title: "Daily Clear Failed",
      body: "There was an error clearing today's tasks. Please check the app.",
    });
  }
}

async function checkAndPerformMissedClears() {
  try {
    const lastClearDateStr = await getSetting('lastMidnightClear') as string | null;
    const today = DateTime.local().startOf('day');
    
    let lastClearDate: DateTime;
    if (lastClearDateStr) {
      lastClearDate = DateTime.fromISO(lastClearDateStr).startOf('day');
    } else {
      // If no last clear date, assume we cleared yesterday
      lastClearDate = today.minus({ days: 1 });
      await setSetting('lastMidnightClear', lastClearDate.toISODate());
      console.log('No last clear date found, assuming yesterday');
      return;
    }
    
    // Check if we missed any days
    const daysMissed = Math.floor(today.diff(lastClearDate, 'days').days);
    
    if (daysMissed > 1) {
      console.log(`App was closed for ${daysMissed - 1} days. Performing missed midnight clear.`);
      
      // Get all completed tasks that should have been cleared
      const db = getDatabase();
      const completedTasks = await db.select<any[]>(
        "SELECT * FROM tasks WHERE (completed = 1 OR completed = '1' OR lower(completed) = 'true')"
      );
      
      if (completedTasks.length > 0) {
        // Perform a single clear for all missed days
        // Use yesterday as the clear date so tasks appear in history correctly
        await performMidnightClear(today.minus({ days: 1 }));
        
        await sendNotification({
          title: "Missed Daily Clears Processed",
          body: `App was closed for ${daysMissed - 1} day${daysMissed === 2 ? '' : 's'}. Completed tasks have been archived.`,
        });
      } else {
        // Update the last clear date even if no tasks to clear
        await setSetting('lastMidnightClear', today.minus({ days: 1 }).toISODate());
        console.log('No completed tasks to clear from missed days');
      }
    } else if (daysMissed === 1) {
      console.log('App started on a new day, no missed clears');
    } else {
      console.log('App already cleared today');
    }
  } catch (error) {
    console.error('Failed to check for missed clears:', error);
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