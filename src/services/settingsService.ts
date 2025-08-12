import { getDatabase } from "../db/database";

type SettingKey = 
  | "themeMode" // "auto" | "light" | "dark"
  | "theme" // legacy
  | "reminderLeadMinutes"
  | "overdueWindowMinutes"
  | "startOnLogin"
  | "globalHotkey"
  | "aiProvider" // "none" | "anthropic" | "openai"
  | "aiApiKey"
  | "summaryWeeklyEnabled"
  | "summaryMonthlyEnabled"
  | "summaryWeeklyDay" // 1=Mon..6=Sat, 0=Sun
  | "summaryMonthlyDay" // 1..28 or -1 for last day
  | "summaryTime" // "HH:mm"
  | "summaryDestinationFolder";

const DEFAULT_SETTINGS: Partial<Record<SettingKey, any>> = {
  themeMode: "auto",
  reminderLeadMinutes: 15,
  overdueWindowMinutes: 60,
  startOnLogin: false,
  globalHotkey: "CommandOrControl+Shift+A",
  aiProvider: "none",
  summaryWeeklyEnabled: true,
  summaryMonthlyEnabled: true,
  summaryWeeklyDay: 1, // Monday
  summaryMonthlyDay: 1, // 1st
  summaryTime: "08:00",
  summaryDestinationFolder: "" // Empty means use default app data/summaries folder
};

export async function getSetting<T = any>(key: SettingKey): Promise<T | undefined> {
  try {
    const db = getDatabase();
    const result = await db.select<{ value: string }[]>(
      "SELECT value FROM settings WHERE key = ?",
      [key]
    );
    
    if (result.length > 0) {
      try {
        return JSON.parse(result[0].value) as T;
      } catch {
        return result[0].value as T;
      }
    }
    
    // Return default if setting doesn't exist
    return DEFAULT_SETTINGS[key] as T;
  } catch (error) {
    console.error(`Failed to get setting ${key}:`, error);
    return DEFAULT_SETTINGS[key] as T;
  }
}

export async function setSetting<T = any>(key: SettingKey, value: T): Promise<void> {
  try {
    const db = getDatabase();
    const stringValue = typeof value === "string" ? value : JSON.stringify(value);
    
    // Insert or update setting
    await db.execute(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, stringValue]
    );
  } catch (error) {
    console.error(`Failed to set setting ${key}:`, error);
    throw error;
  }
}

export async function getAllSettings(): Promise<Record<string, any>> {
  try {
    const db = getDatabase();
    const results = await db.select<{ key: string; value: string }[]>(
      "SELECT key, value FROM settings"
    );
    
    const settings: Record<string, any> = { ...DEFAULT_SETTINGS };
    
    for (const row of results) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    
    return settings;
  } catch (error) {
    console.error("Failed to get all settings:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function deleteAllSettings(): Promise<void> {
  try {
    const db = getDatabase();
    await db.execute("DELETE FROM settings");
  } catch (error) {
    console.error("Failed to delete all settings:", error);
    throw error;
  }
}