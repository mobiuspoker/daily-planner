import { DateTime } from 'luxon';
import { getDatabase } from '../db/database';
import { RecurringRule, CreateRecurringRuleInput, UpdateRecurringRuleInput } from '../types/recurring';
import { createTask } from './taskService';

function generateId(): string {
  return `recurring_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function listRules(): Promise<RecurringRule[]> {
  const db = getDatabase();
  const result = await db.select<any[]>(
    "SELECT * FROM recurring_rules ORDER BY title ASC"
  );
  
  return result.map(row => ({
    id: row.id,
    title: row.title,
    notes: row.notes,
    cadenceType: row.cadence_type,
    weekdaysMask: row.weekdays_mask,
    monthlyDay: row.monthly_day,
    timeHHmm: row.time_hhmm,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createRule(input: CreateRecurringRuleInput): Promise<RecurringRule> {
  const db = getDatabase();
  const now = DateTime.utc().toISO();
  const id = generateId();
  
  const rule: RecurringRule = {
    id,
    title: input.title,
    notes: input.notes,
    cadenceType: input.cadenceType,
    weekdaysMask: input.weekdaysMask,
    monthlyDay: input.monthlyDay,
    timeHHmm: input.timeHHmm,
    enabled: input.enabled ?? true,
    createdAt: now!,
    updatedAt: now!,
  };
  
  await db.execute(
    `INSERT INTO recurring_rules (
      id, title, notes, cadence_type, weekdays_mask, 
      monthly_day, time_hhmm, enabled, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rule.id,
      rule.title,
      rule.notes || null,
      rule.cadenceType,
      rule.weekdaysMask ?? null,
      rule.monthlyDay ?? null,
      rule.timeHHmm || null,
      rule.enabled ? 1 : 0,
      rule.createdAt,
      rule.updatedAt,
    ]
  );
  
  return rule;
}

export async function updateRule(id: string, input: UpdateRecurringRuleInput): Promise<RecurringRule> {
  const db = getDatabase();
  const now = DateTime.utc().toISO();
  
  // Get current rule
  const currentRules = await db.select<any[]>(
    "SELECT * FROM recurring_rules WHERE id = ?",
    [id]
  );
  
  if (currentRules.length === 0) {
    throw new Error("Recurring rule not found");
  }
  
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
  
  if (input.cadenceType !== undefined) {
    updates.push("cadence_type = ?");
    params.push(input.cadenceType);
  }
  
  if (input.weekdaysMask !== undefined) {
    updates.push("weekdays_mask = ?");
    params.push(input.weekdaysMask);
  }
  
  if (input.monthlyDay !== undefined) {
    updates.push("monthly_day = ?");
    params.push(input.monthlyDay);
  }
  
  if (input.timeHHmm !== undefined) {
    updates.push("time_hhmm = ?");
    params.push(input.timeHHmm || null);
  }
  
  if (input.enabled !== undefined) {
    updates.push("enabled = ?");
    params.push(input.enabled ? 1 : 0);
  }
  
  updates.push("updated_at = ?");
  params.push(now);
  params.push(id);
  
  await db.execute(
    `UPDATE recurring_rules SET ${updates.join(", ")} WHERE id = ?`,
    params
  );
  
  const updatedRules = await db.select<any[]>(
    "SELECT * FROM recurring_rules WHERE id = ?",
    [id]
  );
  
  const updated = updatedRules[0];
  return {
    id: updated.id,
    title: updated.title,
    notes: updated.notes,
    cadenceType: updated.cadence_type,
    weekdaysMask: updated.weekdays_mask,
    monthlyDay: updated.monthly_day,
    timeHHmm: updated.time_hhmm,
    enabled: updated.enabled === 1,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

export async function deleteRule(id: string): Promise<void> {
  const db = getDatabase();
  await db.execute("DELETE FROM recurring_rules WHERE id = ?", [id]);
}

export function shouldRunToday(rule: RecurringRule, localDate: DateTime): boolean {
  if (!rule.enabled) return false;
  
  if (rule.cadenceType === 'WEEKLY') {
    if (rule.weekdaysMask === undefined || rule.weekdaysMask === null) return false;
    
    // Luxon weekday: 1=Monday, 7=Sunday
    // Our mask: Mon=1<<0, Tue=1<<1, ..., Sun=1<<6
    const luxonWeekday = localDate.weekday;
    const maskBit = luxonWeekday === 7 ? 6 : luxonWeekday - 1; // Convert to 0-6 range
    
    return (rule.weekdaysMask & (1 << maskBit)) !== 0;
  } else if (rule.cadenceType === 'MONTHLY') {
    if (rule.monthlyDay === undefined || rule.monthlyDay === null) return false;
    
    if (rule.monthlyDay === -1) {
      // Last day of month
      const tomorrow = localDate.plus({ days: 1 });
      return tomorrow.month !== localDate.month;
    } else {
      // Specific day of month
      return localDate.day === rule.monthlyDay;
    }
  }
  
  return false;
}

export async function generateForDate(localDate: DateTime): Promise<{ created: number; skipped: number }> {
  const db = getDatabase();
  let created = 0;
  let skipped = 0;
  
  try {
    // Get all enabled rules
    const rules = await listRules();
    const enabledRules = rules.filter(r => r.enabled);
    
    console.log(`Checking ${enabledRules.length} recurring rules for ${localDate.toISODate()}`);
    
    for (const rule of enabledRules) {
      if (!shouldRunToday(rule, localDate)) {
        continue;
      }
      
      // Check for ANY existing task (completed or incomplete) with same title in TODAY
      // This prevents creating duplicates when a recurring task has already been completed
      const existing = await db.select<any[]>(
        "SELECT id, completed FROM tasks WHERE upper(list) = 'TODAY' AND upper(title) = upper(?)",
        [rule.title]
      );
      
      if (existing.length > 0) {
        const status = existing[0].completed ? 'completed' : 'incomplete';
        console.log(`Skipping "${rule.title}" - ${status} task already exists`);
        skipped++;
        continue;
      }
      
      // Create the task
      let scheduledAt: string | undefined;
      if (rule.timeHHmm) {
        const [hours, minutes] = rule.timeHHmm.split(':').map(Number);
        scheduledAt = localDate
          .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 })
          .toISO()!;
      }
      
      await createTask({
        title: rule.title,
        notes: rule.notes,
        list: 'TODAY',
        scheduledAt
      });
      
      console.log(`Created recurring task: "${rule.title}"${scheduledAt ? ' at ' + rule.timeHHmm : ''}`);
      created++;
    }
    
    if (created > 0 || skipped > 0) {
      console.log(`Recurring tasks: ${created} created, ${skipped} skipped (already exist)`);
    }
  } catch (error) {
    console.error('Error generating recurring tasks:', error);
  }
  
  return { created, skipped };
}