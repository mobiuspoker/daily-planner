import { DateTime } from 'luxon';
import { getSetting } from './settingsService';
import { generateWeeklySummary, generateMonthlySummary, listSummaryFiles } from './summaryService';

let weeklyTimer: ReturnType<typeof setTimeout> | null = null;
let monthlyTimer: ReturnType<typeof setTimeout> | null = null;
let resyncTimer: ReturnType<typeof setInterval> | null = null;

function parseTime(timeString: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours: hours || 8, minutes: minutes || 0 };
}

async function getNextWeeklyTime(): Promise<DateTime> {
  const timeStr = await getSetting('summaryTime') || '08:00';
  const { hours, minutes } = parseTime(timeStr as string);
  
  let next = DateTime.now().setZone('local');
  next = next.plus({ weeks: 1 }).startOf('week').plus({ days: 1 });
  next = next.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
  
  if (next <= DateTime.now()) {
    next = next.plus({ weeks: 1 });
  }
  
  return next;
}

async function getNextMonthlyTime(): Promise<DateTime> {
  const timeStr = await getSetting('summaryTime') || '08:00';
  const { hours, minutes } = parseTime(timeStr as string);
  
  let next = DateTime.now().setZone('local');
  next = next.plus({ months: 1 }).startOf('month');
  next = next.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
  
  if (next <= DateTime.now()) {
    next = next.plus({ months: 1 });
  }
  
  return next;
}

async function shouldCatchUpWeekly(): Promise<boolean> {
  const enabled = await getSetting('summaryWeeklyEnabled');
  if (!enabled) return false;
  
  const timeStr = await getSetting('summaryTime') || '08:00';
  const { hours, minutes } = parseTime(timeStr as string);
  
  const now = DateTime.now().setZone('local');
  const thisMondayTime = now.startOf('week').plus({ days: 1 }).set({ 
    hour: hours, 
    minute: minutes, 
    second: 0, 
    millisecond: 0 
  });
  
  if (now < thisMondayTime) return false;
  
  const lastWeekNumber = thisMondayTime.minus({ weeks: 1 }).toFormat('yyyy-WW');
  const expectedFileName = `weekly-${lastWeekNumber}.md`;
  
  const files = await listSummaryFiles();
  const exists = files.some(f => f.name === expectedFileName);
  
  return !exists;
}

async function shouldCatchUpMonthly(): Promise<boolean> {
  const enabled = await getSetting('summaryMonthlyEnabled');
  if (!enabled) return false;
  
  const timeStr = await getSetting('summaryTime') || '08:00';
  const { hours, minutes } = parseTime(timeStr as string);
  
  const now = DateTime.now().setZone('local');
  const thisMonthFirstTime = now.startOf('month').set({ 
    hour: hours, 
    minute: minutes, 
    second: 0, 
    millisecond: 0 
  });
  
  if (now < thisMonthFirstTime) return false;
  
  const lastMonthId = thisMonthFirstTime.minus({ months: 1 }).toFormat('yyyy-MM');
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
  
  const enabled = await getSetting('summaryWeeklyEnabled');
  if (!enabled) return;
  
  const nextTime = await getNextWeeklyTime();
  const msUntilNext = nextTime.toMillis() - DateTime.now().toMillis();
  
  if (msUntilNext > 0) {
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
}

async function scheduleMonthly() {
  if (monthlyTimer) {
    clearTimeout(monthlyTimer);
    monthlyTimer = null;
  }
  
  const enabled = await getSetting('summaryMonthlyEnabled');
  if (!enabled) return;
  
  const nextTime = await getNextMonthlyTime();
  const msUntilNext = nextTime.toMillis() - DateTime.now().toMillis();
  
  if (msUntilNext > 0) {
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