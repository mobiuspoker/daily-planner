import { DateTime } from "luxon";
import { getDatabase } from "../db/database";
import { Task, TaskList, CreateTaskInput, UpdateTaskInput } from "../types/task";

function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function getTasks(list?: TaskList): Promise<Task[]> {
  const db = getDatabase();
  const query = list
    ? "SELECT * FROM tasks WHERE list = ? ORDER BY sort_index ASC"
    : "SELECT * FROM tasks ORDER BY list, sort_index ASC";
  
  const params = list ? [list] : [];
  const result = await db.select<any[]>(query, params);
  
  
  return result.map(row => ({
    id: row.id,
    title: row.title,
    notes: row.notes,
    list: row.list as TaskList,
    sortIndex: row.sort_index,
    hasTime: row.has_time === 1,
    scheduledAt: row.scheduled_at,
    completed: row.completed === 1,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const db = getDatabase();
  const now = DateTime.utc().toISO();
  const id = generateId();
  
  // Get max sort index for the list
  const maxIndexResult = await db.select<any[]>(
    "SELECT MAX(sort_index) as max_index FROM tasks WHERE list = ?",
    [input.list]
  );
  const sortIndex = (maxIndexResult[0]?.max_index ?? -1) + 1;
  
  const task: Task = {
    id,
    title: input.title,
    notes: input.notes,
    list: input.list,
    sortIndex,
    hasTime: !!input.scheduledAt,
    scheduledAt: input.scheduledAt,
    completed: false,
    completedAt: undefined,
    createdAt: now!,
    updatedAt: now!,
  };
  
  await db.execute(
    `INSERT INTO tasks (
      id, title, notes, list, sort_index, has_time, 
      scheduled_at, completed, completed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.id,
      task.title,
      task.notes || null,
      task.list,
      task.sortIndex,
      task.hasTime ? 1 : 0,
      task.scheduledAt || null,
      0,
      null,
      task.createdAt,
      task.updatedAt,
    ]
  );
  
  return task;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const db = getDatabase();
  const now = DateTime.utc().toISO();
  
  // Get current task
  const currentTasks = await db.select<any[]>(
    "SELECT * FROM tasks WHERE id = ?",
    [id]
  );
  
  if (currentTasks.length === 0) {
    throw new Error("Task not found");
  }
  
  const current = currentTasks[0];
  const updates: string[] = [];
  const params: any[] = [];
  
  if (input.title !== undefined) {
    updates.push("title = ?");
    params.push(input.title);
  }
  
  if (input.notes !== undefined) {
    updates.push("notes = ?");
    params.push(input.notes || null);
  }
  
  if (input.list !== undefined && input.list !== current.list) {
    // Get max sort index for new list
    const maxIndexResult = await db.select<any[]>(
      "SELECT MAX(sort_index) as max_index FROM tasks WHERE list = ?",
      [input.list]
    );
    const newSortIndex = (maxIndexResult[0]?.max_index ?? -1) + 1;
    
    updates.push("list = ?", "sort_index = ?");
    params.push(input.list, newSortIndex);
  }
  
  if (input.scheduledAt !== undefined) {
    updates.push("scheduled_at = ?", "has_time = ?");
    params.push(input.scheduledAt || null, input.scheduledAt ? 1 : 0);
  }
  
  if (input.completed !== undefined) {
    updates.push("completed = ?", "completed_at = ?");
    params.push(
      input.completed ? 1 : 0,
      input.completed ? now : null
    );
  }
  
  updates.push("updated_at = ?");
  params.push(now);
  params.push(id);
  
  await db.execute(
    `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`,
    params
  );
  
  const updatedTasks = await db.select<any[]>(
    "SELECT * FROM tasks WHERE id = ?",
    [id]
  );
  
  const updated = updatedTasks[0];
  return {
    id: updated.id,
    title: updated.title,
    notes: updated.notes,
    list: updated.list as TaskList,
    sortIndex: updated.sort_index,
    hasTime: updated.has_time === 1,
    scheduledAt: updated.scheduled_at,
    completed: updated.completed === 1,
    completedAt: updated.completed_at,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

export async function deleteTask(id: string): Promise<void> {
  const db = getDatabase();
  
  // First, get the task details for more precise history deletion
  const tasks = await db.select<any[]>(
    "SELECT title, completed_at, list FROM tasks WHERE id = ?",
    [id]
  );
  
  // Delete from active tasks
  await db.execute("DELETE FROM tasks WHERE id = ?", [id]);
  
  // Also delete from history if it exists there
  // Match by title, source_list, and approximate completed_at to be more precise
  if (tasks.length > 0 && tasks[0].completed_at) {
    const task = tasks[0];
    await db.execute(
      `DELETE FROM task_history 
       WHERE title = ? 
       AND source_list = ? 
       AND completed_at = ?`,
      [task.title, task.list, task.completed_at]
    );
  }
}

export async function reorderTasks(
  taskId: string,
  newIndex: number,
  targetList?: TaskList
): Promise<void> {
  const db = getDatabase();
  
  // Get current task
  const currentTasks = await db.select<any[]>(
    "SELECT * FROM tasks WHERE id = ?",
    [taskId]
  );
  
  if (currentTasks.length === 0) {
    throw new Error("Task not found");
  }
  
  const task = currentTasks[0];
  const list = targetList || task.list;
  
  // Get all tasks in target list
  const listTasks = await db.select<any[]>(
    "SELECT id, sort_index FROM tasks WHERE list = ? AND id != ? ORDER BY sort_index",
    [list, taskId]
  );
  
  // Insert task at new position
  const updatedTasks = [];
  let currentIndex = 0;
  
  for (let i = 0; i <= listTasks.length; i++) {
    if (i === newIndex) {
      updatedTasks.push({ id: taskId, sort_index: currentIndex++ });
    }
    if (i < listTasks.length) {
      updatedTasks.push({ id: listTasks[i].id, sort_index: currentIndex++ });
    }
  }
  
  // Update all tasks with new indices
  for (const update of updatedTasks) {
    await db.execute(
      "UPDATE tasks SET sort_index = ? WHERE id = ?",
      [update.sort_index, update.id]
    );
  }
  
  // Update list if needed
  if (targetList && targetList !== task.list) {
    await db.execute(
      "UPDATE tasks SET list = ? WHERE id = ?",
      [targetList, taskId]
    );
  }
}