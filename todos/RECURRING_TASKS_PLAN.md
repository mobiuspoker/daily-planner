# Recurring Tasks – Implementation Plan

## Goals
- Allow users to define recurring tasks (e.g., “Workout”) that appear automatically on appropriate days.
- Support weekly cadence (specific weekdays) and monthly cadence (specific day numbers or last day of month).
- Optional time for each recurring task. If set, created task has `hasTime=true` and `scheduledAt` for today at that time.
- Automatically generate today’s instances after Midnight Clear, without duplicating tasks that already exist and are incomplete.
- Keep UX consistent with existing single-column modals and follow `todos/UI_STYLE_GUIDE.md`.

## User Stories
- As a user, I can add a recurring rule for “Workout” on Mon–Fri at 5:00 PM so a “Workout” task shows up in `TODAY` each weekday.
- As a user, I can pick a day of month (e.g., 1st, 5th, or Last day) and an optional time for a recurring task.
- As a user, I won’t get duplicates if a task with the same title is already in `TODAY` and incomplete.
- As a user, the app will create today’s recurring tasks on startup if it missed midnight (e.g., app was closed or device asleep at midnight).

## Data Model
Introduce a dedicated table for recurring rules. Instances continue to live in `tasks`.

Table: `recurring_rules`
- `id` TEXT PRIMARY KEY
- `title` TEXT NOT NULL
- `notes` TEXT NULL
- `cadence_type` TEXT NOT NULL CHECK (`cadence_type` IN ('WEEKLY','MONTHLY'))
- `weekdays_mask` INTEGER NULL  // bitmask Mon=1<<0..Sun=1<<6 for WEEKLY
- `monthly_day` INTEGER NULL     // 1..28 or -1 for last day for MONTHLY
- `time_hhmm` TEXT NULL         // 'HH:mm' or NULL for no time
- `enabled` INTEGER NOT NULL DEFAULT 1
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

Notes:
- Target list: start with `TODAY` only to match current product behavior. We can add a `target_list` later if needed.
- Duplicate prevention: compare against current `TODAY` tasks by `title` where `completed=false`.

## Generation Logic
Create `src/services/recurringTaskService.ts`:
- `listRules(): Promise<RecurringRule[]>`
- `createRule(input): Promise<RecurringRule>` / `updateRule(id, input)` / `deleteRule(id)`
- `shouldRunToday(rule: RecurringRule, localDate: DateTime): boolean`
- `generateForDate(localDate: DateTime): Promise<{ created: number }>`
  - For each enabled rule:
    1) If `shouldRunToday` is true, check for existing incomplete task in `TODAY` with same `title`.
    2) If none exists, create a new task in `TODAY` with `scheduledAt = localDate.set({ hour, minute })` when `time_hhmm` is provided; otherwise no time.

Edge cases:
- Monthly `-1` means last calendar day for `localDate.month`.
- Timezone/DST handled by Luxon using `DateTime.local()` (consistent with existing code).

## Midnight Clear Integration
Hook generation after the archive step finishes, before reloading store notifications:
- In `src/services/midnightClear.ts`, after processing completed tasks but before final notification/log, call `recurringTaskService.generateForDate(DateTime.local())`.
- Ensure `runMidnightClear()` and the “Run Midnight Clear Now” menu action also trigger generation.

App startup safety:
- On app init (where we already call `setupMidnightClear()`), also call `recurringTaskService.generateForDate(DateTime.local())` once to catch missed midnights.

## Import/Export
Extend existing import/export to include `recurring_rules` records.
- Export: add a `recurringRules` array alongside tasks and settings.
- Import: upsert rules on ID; if ID conflict, keep existing.

## UI/UX
Principles:
- Single-column layout for all dialogs.
- Serif for content, sans-serif for meta; no blue focus/hover; no shadows; use sage green for accents; follow `todos/UI_STYLE_GUIDE.md`.

Entry points in menu:
- App menu (`src/components/AppMenu.tsx` and `src/components/AppMenuSimple.tsx`): add a new menu item under the Settings/Tools section:
  - Label: “Recurring Tasks”
  - Action: opens Recurring Tasks modal

Recurring Tasks Modal (`src/components/RecurringTasksModal.tsx` + `.css`):
- Single-column management view.
- Sections:
  - List of existing rules (title, cadence summary, time, enabled toggle, edit/delete icon buttons)
  - “Add Recurring Task” button
- Add/Edit Rule form fields:
  - Title (input, serif)
  - Notes (textarea, optional)
  - Cadence Type (tabs or radio): Weekly | Monthly
    - Weekly: weekday multi-select (Mon..Sun)
    - Monthly: day selector (1..28, and “Last day”)
  - Time (dropdown or free text ‘HH:mm’, optional)
  - Enabled (toggle)
  - Primary button: Save; Secondary: Cancel

Styling:
- Use bordered containers, `--line-color` borders, radii per guide, no shadows.
- Buttons follow existing sizes/opacity transitions.
- Use `CustomDropdown` where appropriate for consistent selects.

Keyboard & a11y:
- Escape to close, Enter to save, proper labels and aria attributes.

## Types
Add `src/types/recurring.ts`:
- `export type RecurrenceCadence = 'WEEKLY' | 'MONTHLY'`
- `export interface RecurringRule { id; title; notes?; cadenceType; weekdaysMask?; monthlyDay?; timeHHmm?; enabled; createdAt; updatedAt }`

## Database Changes
- Add migration in `src/db/database.ts` to create `recurring_rules` table and an index on `enabled`.

## Notifications
- Existing notifications rely on `scheduledAt`. Generated tasks with time will inherit reminder behavior automatically.

## Duplicate Prevention Details
- Check `SELECT id FROM tasks WHERE upper(list)='TODAY' AND (completed=0 OR completed IS NULL) AND title = ?` before creating.
- This keeps leftover incomplete tasks from prior days and avoids adding a duplicate.

## Rollout Steps
1) DB: add `recurring_rules` table and indices.
2) Types: add `recurring.ts`.
3) Service: implement `recurringTaskService` with CRUD + `generateForDate`.
4) Midnight: call generator from `performMidnightClear()` and once on app startup.
5) UI: add `RecurringTasksModal` and related CSS.
6) Menu: add “Recurring Tasks” item to both `AppMenu.tsx` and `AppMenuSimple.tsx` to open modal.
7) Import/Export: include recurring rules.
8) QA: verify Mon–Fri at 17:00 rule, monthly 1st/5th/Last-day rules; check no duplicates; check startup catch-up.

## Acceptance Criteria
- Users can create, edit, enable/disable, and delete recurring rules.
- After Midnight Clear (or manual run), expected tasks appear in `TODAY` for that date, with optional time.
- No duplicate task is created when an incomplete task with the same title already exists in `TODAY`.
- UI follows `todos/UI_STYLE_GUIDE.md` and uses a single-column modal.
- Import/Export includes recurring rules.

## Future Enhancements (not in initial scope)
- Target list selector (e.g., `FUTURE`).
- Skip creation on holidays or during user-defined blackout dates.
- Per-rule notes templating and smart titles.
- Per-rule reminder lead override.


