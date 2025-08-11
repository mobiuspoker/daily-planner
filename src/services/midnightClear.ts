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
    
    // Get all incomplete TODAY tasks
    const incompleteTasks = await db.select<any[]>(
      "SELECT * FROM tasks WHERE list = 'TODAY' AND completed = 0"
    );
    
    console.log(`Midnight clear: Found ${incompleteTasks.length} incomplete tasks to move`);
    
    // Begin transaction
    await db.execute("BEGIN TRANSACTION");
    
    try {
      // Move incomplete tasks to history
      for (const task of incompleteTasks) {
        await db.execute(
          `INSERT INTO task_history (id, source_list, title, completed_at, cleared_on, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            "TODAY",
            task.title,
            null,
            today!,
            now!
          ]
        );
      }
      
      // Move incomplete TODAY tasks to FUTURE
      await db.execute(
        `UPDATE tasks 
         SET list = 'FUTURE', 
             updated_at = ?,
             sort_index = sort_index + (SELECT COALESCE(MAX(sort_index), 0) + 1 FROM tasks WHERE list = 'FUTURE')
         WHERE list = 'TODAY' AND completed = 0`,
        [now]
      );
      
      // Move completed TODAY tasks to history
      const completedTasks = await db.select<any[]>(
        "SELECT * FROM tasks WHERE list = 'TODAY' AND completed = 1"
      );
      
      for (const task of completedTasks) {
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
      }
      
      // Delete completed TODAY tasks
      await db.execute(
        "DELETE FROM tasks WHERE list = 'TODAY' AND completed = 1"
      );
      
      // Commit transaction
      await db.execute("COMMIT");
      
      // Reload tasks in the store
      await useTaskStore.getState().loadTasks();
      
      // Send notification
      if (incompleteTasks.length > 0) {
        await sendNotification({
          title: "Daily Clear Complete",
          body: `${incompleteTasks.length} incomplete task${incompleteTasks.length === 1 ? '' : 's'} moved to Future`,
        });
      }
      
      console.log("Midnight clear completed successfully");
    } catch (error) {
      // Rollback on error
      await db.execute("ROLLBACK");
      throw error;
    }
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
  await performMidnightClear();
}