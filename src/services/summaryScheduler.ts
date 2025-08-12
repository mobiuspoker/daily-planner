import { DateTime } from 'luxon';
import { getSetting } from './settingsService';
import { generateWeeklySummary, generateMonthlySummary, listSummaryFiles } from './summaryService';

let weeklyTimer: ReturnType<typeof setTimeout> | null = null;
let monthlyTimer: ReturnType<typeof setTimeout> | null = null;
let resyncTimer: ReturnType<typeof setInterval> | null = null;

// Limit single timeouts to one day to avoid overflow/clamping issues across platforms
const MAX_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

function parseTime(timeString: string): { hours: number; minutes: number } {
  if (typeof timeString !== 'string') {
    return { hours: 8, minutes: 0 };
  }
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeString.trim());
  if (!match) {
    return { hours: 8, minutes: 0 };
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return { hours: 8, minutes: 0 };
  }
  return { hours, minutes };
}

function normalizeWeeklyDay(day: number): number {
  // App stores Sunday as 0. Luxon uses 1=Mon..7=Sun
  return day === 0 ? 7 : day;
}

async function getNextWeeklyTime(): Promise<DateTime> {
  const timeStr = (await getSetting('summaryTime')) || '08:00';
  const { hours, minutes } = parseTime(timeStr as string);
  const configuredDay = (await getSetting('summaryWeeklyDay')) ?? 1; // 1=Mon..7=Sun (0 means Sunday)
  const dayOfWeek = normalizeWeeklyDay(configuredDay as number);

  const now = DateTime.now().setZone('local');

  // Candidate for this week's selected weekday at the selected time
  let candidate = now
    .startOf('week')
    .plus({ days: dayOfWeek - 1 })
    .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });

  if (candidate <= now) {
    candidate = candidate.plus({ weeks: 1 });
  }

  return candidate;
}

async function getNextMonthlyTime(): Promise<DateTime> {
  const timeStr = (await getSetting('summaryTime')) || '08:00';
  const { hours, minutes } = parseTime(timeStr as string);
  const dayOfMonth = (await getSetting('summaryMonthlyDay')) ?? 1; // 1..28 or -1 for last day

  const now = DateTime.now().setZone('local');

  const buildMonthlyCandidate = (base: DateTime): DateTime => {
    let d: DateTime;
    if ((dayOfMonth as number) === -1) {
      d = base.endOf('month').startOf('day');
    } else {
      d = base.startOf('month').plus({ days: (dayOfMonth as number) - 1 });
    }
    return d.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
  };

  let candidate = buildMonthlyCandidate(now);
  if (candidate <= now) {
    candidate = buildMonthlyCandidate(now.plus({ months: 1 }));
  }
  return candidate;
}

async function shouldCatchUpWeekly(): Promise<boolean> {
  const enabled = await getSetting('summaryWeeklyEnabled') ?? true;
  if (!enabled) return false;
  
  const timeStr = await getSetting('summaryTime') || '08:00';
  const { hours, minutes } = parseTime(timeStr as string);
  const dayOfWeek = (await getSetting('summaryWeeklyDay') ?? 1) as number;
  
  const now = DateTime.now().setZone('local');
  
  // Find this week's scheduled day/time
  let thisWeekTime = now.startOf('week');
  if (dayOfWeek === 0) {
    // Sunday (move to end of week in ISO format)
    thisWeekTime = thisWeekTime.plus({ days: 6 });
  } else {
    thisWeekTime = thisWeekTime.plus({ days: dayOfWeek - 1 });
  }
  thisWeekTime = thisWeekTime.set({ 
    hour: hours, 
    minute: minutes, 
    second: 0, 
    millisecond: 0 
  });
  
  if (now < thisWeekTime) return false;
  
  const lastWeekNumber = thisWeekTime.minus({ weeks: 1 }).toFormat('yyyy-WW');
  const expectedFileName = `weekly-${lastWeekNumber}.md`;
  
  const files = await listSummaryFiles();
  const exists = files.some(f => f.name === expectedFileName);
  
  return !exists;
}

async function shouldCatchUpMonthly(): Promise<boolean> {
  const enabled = await getSetting('summaryMonthlyEnabled') ?? true;
  if (!enabled) return false;
  
  const timeStr = await getSetting('summaryTime') || '08:00';
  const { hours, minutes } = parseTime(timeStr as string);
  const dayOfMonth = (await getSetting('summaryMonthlyDay') ?? 1) as number;
  
  const now = DateTime.now().setZone('local');
  
  let thisMonthTime: DateTime;
  if (dayOfMonth === -1) {
    // Last day of this month
    thisMonthTime = now.endOf('month').startOf('day');
  } else {
    // Specific day of this month
    thisMonthTime = now.startOf('month').plus({ days: dayOfMonth - 1 });
  }
  
  thisMonthTime = thisMonthTime.set({ 
    hour: hours, 
    minute: minutes, 
    second: 0, 
    millisecond: 0 
  });
  
  if (now < thisMonthTime) return false;
  
  const lastMonthId = thisMonthTime.minus({ months: 1 }).toFormat('yyyy-MM');
  const expectedFileName = `monthly-${lastMonthId}.md`;
  
  const files = await listSummaryFiles();
  const exists = files.some(f => f.name === expectedFileName);
  
  return !exists;
}

async function scheduleWeekly() {
  if (weeklyTimer) {
    clearTimeout(weeklyTimer);
    weeklyTimer = null;
  }
  
  const enabled = await getSetting('summaryWeeklyEnabled') ?? true;
  if (!enabled) return;
  
  const nextTime = await getNextWeeklyTime();
  const msUntilNext = nextTime.toMillis() - DateTime.now().toMillis();
  if (msUntilNext <= 0) {
    // In case of clock skew, reschedule soon
    weeklyTimer = setTimeout(scheduleWeekly, 60 * 1000);
    return;
  }

  if (msUntilNext > MAX_TIMEOUT_MS) {
    console.log(`Weekly summary is far in the future (${Math.round(msUntilNext / (60 * 60 * 1000))}h). Scheduling a check in 24h...`);
    weeklyTimer = setTimeout(scheduleWeekly, MAX_TIMEOUT_MS);
    return;
  }

  console.log(`Weekly summary scheduled for ${nextTime.toFormat('yyyy-MM-dd HH:mm')}`);
  weeklyTimer = setTimeout(async () => {
    try {
      await generateWeeklySummary();
      console.log('Weekly summary generated successfully');
    } catch (error) {
      console.error('Failed to generate weekly summary:', error);
    }
    scheduleWeekly();
  }, msUntilNext);
}

async function scheduleMonthly() {
  if (monthlyTimer) {
    clearTimeout(monthlyTimer);
    monthlyTimer = null;
  }
  
  const enabled = await getSetting('summaryMonthlyEnabled') ?? true;
  if (!enabled) return;
  
  const nextTime = await getNextMonthlyTime();
  const msUntilNext = nextTime.toMillis() - DateTime.now().toMillis();
  if (msUntilNext <= 0) {
    monthlyTimer = setTimeout(scheduleMonthly, 60 * 1000);
    return;
  }

  if (msUntilNext > MAX_TIMEOUT_MS) {
    console.log(`Monthly summary is far in the future (${Math.round(msUntilNext / (24 * 60 * 60 * 1000))}d). Scheduling a check in 24h...`);
    monthlyTimer = setTimeout(scheduleMonthly, MAX_TIMEOUT_MS);
    return;
  }

  console.log(`Monthly summary scheduled for ${nextTime.toFormat('yyyy-MM-dd HH:mm')}`);
  monthlyTimer = setTimeout(async () => {
    try {
      await generateMonthlySummary();
      console.log('Monthly summary generated successfully');
    } catch (error) {
      console.error('Failed to generate monthly summary:', error);
    }
    scheduleMonthly();
  }, msUntilNext);
}

async function resync() {
  await scheduleWeekly();
  await scheduleMonthly();
}

export async function setupSummaryScheduler() {
  console.log('Setting up summary scheduler...');
  
  if (await shouldCatchUpWeekly()) {
    console.log('Generating missed weekly summary...');
    try {
      await generateWeeklySummary();
    } catch (error) {
      console.error('Failed to generate catch-up weekly summary:', error);
    }
  }
  
  if (await shouldCatchUpMonthly()) {
    console.log('Generating missed monthly summary...');
    try {
      await generateMonthlySummary();
    } catch (error) {
      console.error('Failed to generate catch-up monthly summary:', error);
    }
  }
  
  await scheduleWeekly();
  await scheduleMonthly();
  
  resyncTimer = setInterval(resync, 15 * 60 * 1000);
}

export function stopSummaryScheduler() {
  if (weeklyTimer) {
    clearTimeout(weeklyTimer);
    weeklyTimer = null;
  }
  
  if (monthlyTimer) {
    clearTimeout(monthlyTimer);
    monthlyTimer = null;
  }
  
  if (resyncTimer) {
    clearInterval(resyncTimer);
    resyncTimer = null;
  }
  
  console.log('Summary scheduler stopped');
}

export async function generateWeeklyNow() {
  return generateWeeklySummary();
}

export async function generateMonthlyNow() {
  return generateMonthlySummary();
}