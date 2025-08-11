import { sendNotification, requestPermission, isPermissionGranted } from "@tauri-apps/plugin-notification";
import { DateTime } from "luxon";
import { useTaskStore } from "../state/taskStore";

let notificationInterval: NodeJS.Timeout | null = null;
const notifiedTasks = new Set<string>();

export async function setupNotifications() {
  // Request permission if not granted
  const permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    const permission = await requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied");
      return;
    }
  }

  // Check for upcoming tasks every minute
  notificationInterval = setInterval(checkUpcomingTasks, 60000);
  
  // Also check immediately
  checkUpcomingTasks();
}

async function checkUpcomingTasks() {
  const tasks = useTaskStore.getState().tasks;
  const now = DateTime.local();
  
  for (const task of tasks) {
    // Skip if already completed or no scheduled time
    if (task.completed || !task.scheduledAt) continue;
    
    // Skip if already notified
    if (notifiedTasks.has(task.id)) continue;
    
    const taskTime = DateTime.fromISO(task.scheduledAt);
    const diffMinutes = taskTime.diff(now, "minutes").minutes;
    
    // Notify at 15 minutes before
    if (diffMinutes > 0 && diffMinutes <= 15) {
      await sendNotification({
        title: "Task Reminder",
        body: `"${task.title}" is due in ${Math.round(diffMinutes)} minutes`,
        icon: undefined,
      });
      
      notifiedTasks.add(task.id);
    }
    
    // Notify when overdue
    if (diffMinutes < 0 && diffMinutes > -60) {
      await sendNotification({
        title: "Task Overdue",
        body: `"${task.title}" was due ${Math.abs(Math.round(diffMinutes))} minutes ago`,
        icon: undefined,
      });
      
      notifiedTasks.add(task.id);
    }
  }
}

export function clearNotificationCache(taskId?: string) {
  if (taskId) {
    notifiedTasks.delete(taskId);
  } else {
    notifiedTasks.clear();
  }
}

export function stopNotifications() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
}