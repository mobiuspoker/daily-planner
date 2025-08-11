import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function initializeDatabase(): Promise<void> {
  try {
    db = await Database.load("sqlite:tasks.db");
    await runMigrations();
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

async function runMigrations(): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  // Create tasks table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT,
      list TEXT NOT NULL CHECK (list IN ('TODAY','FUTURE')),
      sort_index INTEGER NOT NULL,
      has_time INTEGER NOT NULL DEFAULT 0,
      scheduled_at TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create history table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS task_history (
      id TEXT PRIMARY KEY,
      source_list TEXT NOT NULL,
      title TEXT NOT NULL,
      completed_at TEXT,
      cleared_on TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Create indices
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_tasks_list_sort 
    ON tasks(list, sort_index)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_history_cleared 
    ON task_history(cleared_on)
  `);

  // Create settings table for preferences
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

export function getDatabase(): Database {
  if (!db) throw new Error("Database not initialized");
  return db;
}