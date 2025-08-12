# Summary Day Selection - Implementation Plan

## Problem
Users can configure the time for summaries (e.g., 8:00 AM) but not the day. This creates an incomplete scheduling experience where:
- Weekly summaries are hardcoded to Mondays
- Monthly summaries are hardcoded to the 1st
- Users who prefer different days (Sunday review, mid-month check-ins) have no option

## Solution: Add Day Selection

### UI Changes

#### Settings Modal
Add two new dropdowns in the Summaries section:

**Weekly Summary Day**
- Options: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
- Default: Monday
- Stored as: `summaryWeeklyDay` (0-6, where 0=Monday per ISO)

**Monthly Summary Day**
- Options: 
  - 1st through 28th (safe for all months)
  - "Last day of month" (special value: -1)
- Default: 1st
- Stored as: `summaryMonthlyDay` (1-28 or -1)

Layout:
```
Summaries
[✓] Weekly Summary     Day: [Monday ▼]    Time: [8:00 AM ▼]
[✓] Monthly Summary    Day: [1st ▼]       Time: [8:00 AM ▼]
```

### Service Changes

#### settingsService.ts
- Add new setting keys: `summaryWeeklyDay`, `summaryMonthlyDay`
- Default values: 0 (Monday), 1 (1st)

#### summaryScheduler.ts
Update scheduling logic:

**Weekly:**
```typescript
async function getNextWeeklyTime(): Promise<DateTime> {
  const timeStr = await getSetting('summaryTime') || '08:00';
  const dayOfWeek = await getSetting('summaryWeeklyDay') ?? 0; // 0=Monday
  
  // Calculate next occurrence of that day
  let next = DateTime.now().setZone('local');
  // Move to next week's start, then to the selected day
  next = next.plus({ weeks: 1 }).startOf('week').plus({ days: dayOfWeek });
  // Set the time
  next = next.set({ hour: hours, minute: minutes, second: 0 });
  
  // If it's in the past, add another week
  if (next <= DateTime.now()) {
    next = next.plus({ weeks: 1 });
  }
}
```

**Monthly:**
```typescript
async function getNextMonthlyTime(): Promise<DateTime> {
  const timeStr = await getSetting('summaryTime') || '08:00';
  const dayOfMonth = await getSetting('summaryMonthlyDay') ?? 1;
  
  let next = DateTime.now().setZone('local');
  
  if (dayOfMonth === -1) {
    // Last day of next month
    next = next.plus({ months: 1 }).endOf('month').startOf('day');
  } else {
    // Specific day of next month
    next = next.plus({ months: 1 }).startOf('month').plus({ days: dayOfMonth - 1 });
  }
  
  // Set the time
  next = next.set({ hour: hours, minute: minutes, second: 0 });
  
  // If it's in the past, add another month
  if (next <= DateTime.now()) {
    next = next.plus({ months: 1 });
  }
}
```

### Migration Considerations
- Existing users with schedules should maintain their current behavior
- New setting keys default to current hardcoded values (Monday, 1st)
- No data migration needed - nullish coalescing handles missing values

### Implementation Steps

1. **Update SettingsModal.tsx** (20 min)
   - Add state for weeklyDay and monthlyDay
   - Add two CustomDropdown components
   - Wire up to settings store
   - Adjust layout for better spacing

2. **Update summaryScheduler.ts** (15 min)
   - Modify getNextWeeklyTime() to use day setting
   - Modify getNextMonthlyTime() to use day setting
   - Update catch-up logic to consider new day settings

3. **Test Cases** (10 min)
   - Weekly: Test each day of week
   - Monthly: Test 1st, 15th, 28th, last day
   - Verify schedules update when settings change
   - Test catch-up generation for missed summaries

### Edge Cases

1. **February and 29-31st days**
   - Limit monthly options to 1-28 and "Last day"
   - This avoids February 30th issues

2. **Time zone changes**
   - DateTime.setZone('local') handles DST automatically

3. **Setting changes while scheduled**
   - Resync timer (every 15 min) will pick up changes
   - Could add immediate reschedule on setting change

### Alternative Simplification
If this feels too complex, we could:
- Keep weekly on Monday but let users choose the day for monthly
- Or use radio buttons for common presets (Monday morning, Sunday evening, etc.)

### Estimated Time
- Total: ~45 minutes
- Low risk - doesn't affect existing summaries or data

## Decision Point
Should we proceed with full day selection or would you prefer a simpler approach?