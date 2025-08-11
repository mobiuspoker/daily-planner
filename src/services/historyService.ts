import { getDatabase } from "../db/database";
import { DateTime } from "luxon";

export interface HistoryItem {
  id: string;
  sourceList: "TODAY" | "FUTURE";
  title: string;
  completedAt: string | null;
  clearedOn: string;
  createdAt: string;
}

export interface DayWithHistory {
  date: string;
  count: number;
}

export async function getDistinctDays(limit = 90, offset = 0): Promise<DayWithHistory[]> {
  try {
    const db = getDatabase();
    const result = await db.select<{ cleared_on: string; count: number }[]>(
      `SELECT cleared_on, COUNT(*) as count 
       FROM task_history 
       GROUP BY cleared_on
       ORDER BY cleared_on DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    return result.map(row => ({
      date: row.cleared_on,
      count: row.count
    }));
  } catch (error) {
    console.error("Failed to get distinct days:", error);
    return [];
  }
}

export async function getByDay(dayISO: string, search?: string): Promise<HistoryItem[]> {
  try {
    const db = getDatabase();
    let query = `SELECT id, source_list as sourceList, title, completed_at as completedAt, 
                        cleared_on as clearedOn, created_at as createdAt
                 FROM task_history 
                 WHERE cleared_on = ?`;
    const params: any[] = [dayISO];
    
    if (search) {
      query += " AND title LIKE ?";
      params.push(`%${search}%`);
    }
    
    query += " ORDER BY created_at DESC";
    
    const result = await db.select<HistoryItem[]>(query, params);
    return result;
  } catch (error) {
    console.error("Failed to get history by day:", error);
    return [];
  }
}

export async function getRange(startISO: string, endISO: string): Promise<HistoryItem[]> {
  try {
    const db = getDatabase();
    const result = await db.select<HistoryItem[]>(
      `SELECT id, source_list as sourceList, title, completed_at as completedAt, 
              cleared_on as clearedOn, created_at as createdAt
       FROM task_history 
       WHERE cleared_on >= ? AND cleared_on <= ?
       ORDER BY cleared_on DESC, created_at DESC`,
      [startISO, endISO]
    );
    
    return result;
  } catch (error) {
    console.error("Failed to get history range:", error);
    return [];
  }
}

export async function searchHistory(query: string, limit = 200): Promise<HistoryItem[]> {
  try {
    const db = getDatabase();
    const result = await db.select<HistoryItem[]>(
      `SELECT id, source_list as sourceList, title, completed_at as completedAt, 
              cleared_on as clearedOn, created_at as createdAt
       FROM task_history 
       WHERE title LIKE ?
       ORDER BY cleared_on DESC, created_at DESC
       LIMIT ?`,
      [`%${query}%`, limit]
    );
    
    return result;
  } catch (error) {
    console.error("Failed to search history:", error);
    return [];
  }
}

export async function getMonthDays(year: number, month: number): Promise<DayWithHistory[]> {
  try {
    const startDate = DateTime.local(year, month, 1).toISODate();
    const endDate = DateTime.local(year, month, 1).endOf("month").toISODate();
    
    const db = getDatabase();
    const result = await db.select<{ cleared_on: string; count: number }[]>(
      `SELECT cleared_on, COUNT(*) as count 
       FROM task_history 
       WHERE cleared_on >= ? AND cleared_on <= ?
       GROUP BY cleared_on
       ORDER BY cleared_on`,
      [startDate, endDate]
    );
    
    return result.map(row => ({
      date: row.cleared_on,
      count: row.count
    }));
  } catch (error) {
    console.error("Failed to get month days:", error);
    return [];
  }
}

export async function getTotalHistoryCount(): Promise<number> {
  try {
    const db = getDatabase();
    const result = await db.select<{ count: number }[]>(
      "SELECT COUNT(*) as count FROM task_history"
    );
    return result[0]?.count || 0;
  } catch (error) {
    console.error("Failed to get total history count:", error);
    return 0;
  }
}