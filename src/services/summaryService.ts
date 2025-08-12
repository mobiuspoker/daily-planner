import { DateTime } from 'luxon';
import { writeTextFile, readDir, mkdir, remove } from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';
import { Command } from '@tauri-apps/plugin-shell';
import { sendNotification } from '@tauri-apps/plugin-notification';
import { getRange } from './historyService';
import { getSetting } from './settingsService';
import { generatePolishedSummary } from './aiSummaryService';

export interface SummaryFile {
  path: string;
  name: string;
  type: 'weekly' | 'monthly';
  createdAt?: string;
}

export interface SummaryResult {
  path: string;
  name: string;
  type: 'weekly' | 'monthly';
  createdAt: string;
  plainMarkdown: string;
}

export async function getDestinationFolder(): Promise<string> {
  const customFolder = await getSetting('summaryDestinationFolder');
  if (customFolder && typeof customFolder === 'string') {
    return customFolder;
  }
  const appData = await appDataDir();
  const separator = appData.endsWith('\\') || appData.endsWith('/') ? '' : '\\';
  return `${appData}${separator}summaries`;
}

async function ensureFolderExists(folderPath: string): Promise<void> {
  try {
    await mkdir(folderPath, { recursive: true });
  } catch (error) {
    console.error('Error creating folder:', error);
  }
}

function getWeekRange(reference: Date = new Date()): { start: DateTime; end: DateTime; weekNumber: string } {
  const dt = DateTime.fromJSDate(reference).setZone('local');
  const startOfWeek = dt.startOf('week').minus({ weeks: 1 });
  const endOfWeek = startOfWeek.endOf('week');
  const weekNumber = startOfWeek.toFormat('yyyy-WW');
  
  return {
    start: startOfWeek,
    end: endOfWeek,
    weekNumber
  };
}

function getMonthRange(reference: Date = new Date()): { start: DateTime; end: DateTime; monthId: string } {
  const dt = DateTime.fromJSDate(reference).setZone('local');
  const previousMonth = dt.minus({ months: 1 });
  const start = previousMonth.startOf('month');
  const end = previousMonth.endOf('month');
  const monthId = start.toFormat('yyyy-MM');
  
  return {
    start,
    end,
    monthId
  };
}

async function generateMarkdown(
  startISO: string,
  endISO: string,
  type: 'weekly' | 'monthly',
  dateRange: string,
  aiSummary?: string
): Promise<string> {
  const tasks = await getRange(startISO, endISO);
  
  const groupedByDay = tasks.reduce((acc, task) => {
    const day = task.clearedOn || 'Unknown';
    if (!acc[day]) {
      acc[day] = {};
    }
    const list = task.sourceList || 'Unknown';
    if (!acc[day][list]) {
      acc[day][list] = [];
    }
    acc[day][list].push(task);
    return acc;
  }, {} as Record<string, Record<string, typeof tasks>>);
  
  let markdown = `# ${type === 'weekly' ? 'Weekly' : 'Monthly'} Summary\n\n`;
  markdown += `${dateRange}\n`;
  const now = DateTime.now();
  const formattedDate = now.toFormat('EEEE, MMMM d \'at\' h:mm');
  const period = now.toFormat('a').toLowerCase();
  markdown += `Generated ${formattedDate} ${period}\n\n`;
  
  const totalTasks = tasks.length;
  
  if (totalTasks === 0) {
    markdown += '*No tasks completed during this period.*\n';
    return markdown;
  }
  
  // AI Summary at the top
  if (aiSummary) {
    markdown += '## Summary\n\n';
    markdown += aiSummary + '\n\n';
  }
  
  // Statistics section
  markdown += '## Statistics\n\n';
  markdown += `${totalTasks} tasks completed\n\n`;
  
  // Most productive day
  const dayTotals = Object.entries(groupedByDay).map(([day, lists]) => {
    const total = Object.values(lists).reduce((sum, tasks) => sum + tasks.length, 0);
    return { day, total };
  }).sort((a, b) => b.total - a.total);
  
  if (dayTotals.length > 0) {
    const mostProductiveDay = DateTime.fromISO(dayTotals[0].day).toFormat('EEEE, MMMM d');
    markdown += `Most productive: ${mostProductiveDay} with ${dayTotals[0].total} tasks\n`;
  }
  
  // Detailed task list
  markdown += '\n## Completed Tasks\n\n';
  
  const sortedDays = Object.keys(groupedByDay).sort();
  for (const day of sortedDays) {
    const dayDate = DateTime.fromISO(day).toFormat('EEEE, MMMM d');
    const lists = groupedByDay[day];
    const dayTotal = Object.values(lists).reduce((sum, tasks) => sum + tasks.length, 0);
    
    markdown += `### ${dayDate} — ${dayTotal} ${dayTotal === 1 ? 'task' : 'tasks'}\n\n`;
    
    // Combine all tasks without distinguishing by list
    const allTasks = Object.values(lists).flat();
    let taskNumber = 1;
    for (const task of allTasks) {
      markdown += `${taskNumber}. ${task.title}\n`;
      taskNumber++;
    }
    markdown += '\n';
  }
  
  return markdown;
}

export async function generateWeeklySummary(reference: Date = new Date()): Promise<SummaryResult> {
  const { start, end, weekNumber } = getWeekRange(reference);
  const startISO = start.toISODate()!;
  const endISO = end.toISODate()!;
  const dateRange = `${start.toFormat('MMM d')} - ${end.toFormat('MMM d, yyyy')}`;
  
  let aiSummary = '';
  const aiProvider = await getSetting('aiProvider');
  if (aiProvider && aiProvider !== 'none') {
    try {
      // Generate plain markdown first for AI analysis
      const tempMarkdown = await generateMarkdown(startISO, endISO, 'weekly', dateRange);
      
      aiSummary = await generatePolishedSummary({
        period: 'weekly',
        range: { startISO, endISO },
        plainMarkdown: tempMarkdown,
        style: 'concise'
      });
    } catch (error) {
      console.error('AI summary generation failed:', error);
    }
  }
  
  // Generate final markdown with AI summary at the top
  const plainMarkdown = await generateMarkdown(startISO, endISO, 'weekly', dateRange, aiSummary);
  
  const folder = await getDestinationFolder();
  await ensureFolderExists(folder);
  
  const fileName = `weekly-${weekNumber}.md`;
  const filePath = `${folder}/${fileName}`;
  
  await writeTextFile(filePath, plainMarkdown);
  
  await sendNotification({
    title: 'Weekly Summary Generated',
    body: `Your weekly summary for ${dateRange} has been saved.`
  });
  
  return {
    path: filePath,
    name: fileName,
    type: 'weekly',
    createdAt: DateTime.now().toISO()!,
    plainMarkdown
  };
}

export async function generateMonthlySummary(reference: Date = new Date()): Promise<SummaryResult> {
  const { start, end, monthId } = getMonthRange(reference);
  const startISO = start.toISODate()!;
  const endISO = end.toISODate()!;
  const dateRange = start.toFormat('MMMM yyyy');
  
  let aiSummary = '';
  const aiProvider = await getSetting('aiProvider');
  if (aiProvider && aiProvider !== 'none') {
    try {
      // Generate plain markdown first for AI analysis
      const tempMarkdown = await generateMarkdown(startISO, endISO, 'monthly', dateRange);
      
      aiSummary = await generatePolishedSummary({
        period: 'monthly',
        range: { startISO, endISO },
        plainMarkdown: tempMarkdown,
        style: 'detailed'
      });
    } catch (error) {
      console.error('AI summary generation failed:', error);
    }
  }
  
  // Generate final markdown with AI summary at the top
  const plainMarkdown = await generateMarkdown(startISO, endISO, 'monthly', dateRange, aiSummary);
  
  const folder = await getDestinationFolder();
  await ensureFolderExists(folder);
  
  const fileName = `monthly-${monthId}.md`;
  const filePath = `${folder}/${fileName}`;
  
  await writeTextFile(filePath, plainMarkdown);
  
  await sendNotification({
    title: 'Monthly Summary Generated',
    body: `Your monthly summary for ${dateRange} has been saved.`
  });
  
  return {
    path: filePath,
    name: fileName,
    type: 'monthly',
    createdAt: DateTime.now().toISO()!,
    plainMarkdown
  };
}

export async function listSummaryFiles(): Promise<SummaryFile[]> {
  const folder = await getDestinationFolder();
  await ensureFolderExists(folder);
  
  try {
    const entries = await readDir(folder);
    const summaryFiles: SummaryFile[] = [];
    
    for (const entry of entries) {
      if (entry.name && entry.name.endsWith('.md')) {
        const name = entry.name;
        let type: 'weekly' | 'monthly' | undefined;
        
        if (name.startsWith('weekly-')) {
          type = 'weekly';
        } else if (name.startsWith('monthly-')) {
          type = 'monthly';
        }
        
        if (type) {
          summaryFiles.push({
            path: `${folder}/${name}`,
            name,
            type
          });
        }
      }
    }
    
    summaryFiles.sort((a, b) => b.name.localeCompare(a.name));
    
    return summaryFiles;
  } catch (error) {
    console.error('Error listing summary files:', error);
    return [];
  }
}

export async function openSummaryFile(path: string): Promise<void> {
  try {
    if (navigator.platform.includes('Win')) {
      await Command.create('explorer', [path]).execute();
    } else if (navigator.platform.includes('Mac')) {
      await Command.create('open', [path]).execute();
    } else {
      await Command.create('xdg-open', [path]).execute();
    }
  } catch (error) {
    console.error('Error opening summary file:', error);
  }
}

export async function deleteSummaryFile(path: string): Promise<void> {
  try {
    await remove(path);
  } catch (error) {
    console.error('Error deleting summary file:', error);
    throw error;
  }
}