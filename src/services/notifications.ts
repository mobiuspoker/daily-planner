import { sendNotification, requestPermission, isPermissionGranted } from "@tauri-apps/plugin-notification";
import { DateTime } from "luxon";
import { useTaskStore } from "../state/taskStore";
import { getSetting } from "./settingsService";

let notificationInterval: number | null = null;
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
  
  // Get configurable lead times from settings
  const reminderLeadMinutes = await getSetting<number>("reminderLeadMinutes") || 15;
  const overdueWindowMinutes = await getSetting<number>("overdueWindowMinutes") || 60;
  
  // If either setting is -1 (Never), skip that type of notification
  const remindersEnabled = reminderLeadMinutes !== -1;
  const overdueAlertsEnabled = overdueWindowMinutes !== -1;
  
  // Skip all notifications if both are disabled
  if (!remindersEnabled && !overdueAlertsEnabled) return;
  
  for (const task of tasks) {
    // Skip if already completed or no scheduled time
    if (task.completed || !task.scheduledAt) continue;
    
    // Skip if already notified
    if (notifiedTasks.has(task.id)) continue;
    
    const taskTime = DateTime.fromISO(task.scheduledAt);
    const diffMinutes = taskTime.diff(now, "minutes").minutes;
    
    // Notify at configured minutes before (upcoming window)
    if (remindersEnabled && diffMinutes > 0 && diffMinutes <= reminderLeadMinutes) {
      await sendNotification({
        title: "Task Reminder",
        body: `"${task.title}" is due in ${Math.round(diffMinutes)} minutes`,
        icon: undefined,
      });
      
      notifiedTasks.add(task.id);
    }
    
    // Notify when overdue (within configured window)
    if (overdueAlertsEnabled && diffMinutes < 0 && diffMinutes > -overdueWindowMinutes) {
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