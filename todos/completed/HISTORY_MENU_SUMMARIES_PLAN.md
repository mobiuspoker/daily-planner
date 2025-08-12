## History, Menu, Import/Export, Summaries – Implementation Plan

### Scope
- Add a first-class History viewer (calendar + day list) over archived tasks.
- Replace the header theme toggle with a single Menu entry point to: Theme, History, Import/Export, Settings, Help.
- Make reminder lead time configurable (default 15 minutes) and respected by notifications.
- Generate weekly (Mon 08:00) and monthly (1st 08:00) summaries; save to disk; provide in-app viewer.
- Optional AI summaries (Anthropic/OpenAI) appended to the plain summary.

### Current state (ground truth)
- Archiving: At local midnight, completed tasks are copied to `task_history` and deleted from `tasks`. Uncompleted tasks remain. A notification summarizes counts.
  - Inserted fields: `id` (generated), `source_list`, `title`, `completed_at` (from task), `cleared_on` (local ISO date), `created_at` (archive time, not original task creation).
- Database schema: `tasks`, `task_history`, `settings` exist with indices. `notes` exists in `tasks` but is not used in the UI. `scheduled_at` is used for reminders.
- Notifications: poll every minute; send reminder 15 minutes before `scheduled_at` and an overdue notice within 60 minutes after. Lead time is hardcoded.

### Deliverables
- History Viewer with calendar and day list; search and counts.
- App Menu component replacing the theme button.
- Settings persistence for reminder lead time and other preferences.
- Import/Export JSON flows.
- Weekly/Monthly summary generation + viewer + notifications.
- Optional AI summary integration (provider, key, prompt flow).

## Design

### Data model
- No schema changes required for MVP. We will not use `notes` and will not persist `scheduled_at` into `task_history`.
- Indices remain: `idx_tasks_list_sort` on `tasks(list, sort_index)` and `idx_history_cleared` on `task_history(cleared_on)`.

### Services
- `src/services/settingsService.ts`
  - `getSetting<T>(key: string): Promise<T | undefined>`
  - `setSetting<T>(key: string, value: T): Promise<void>`
  - Keys used: `themeMode` ("auto" | "light" | "dark"), `theme` (legacy), `reminderLeadMinutes` (number), `overdueWindowMinutes` (number), `startOnLogin` (boolean), `globalHotkey` (string), `aiProvider` ("none" | "anthropic" | "openai"), `aiApiKey` (string), `summaryWeeklyEnabled` (boolean), `summaryMonthlyEnabled` (boolean), `summaryTime` ("HH:mm"), `summaryDestinationFolder` (path string).

- `src/services/historyService.ts`
  - `getDistinctDays(limit = 90, offset = 0)` → `SELECT DISTINCT cleared_on FROM task_history ORDER BY cleared_on DESC LIMIT ? OFFSET ?`
  - `getByDay(dayISO: string, search?: string)` → rows for a day; optional `LIKE` on `title`.
  - `getRange(startISO: string, endISO: string)` → rows in inclusive range for summaries.
  - `searchHistory(query: string, limit = 200)` → free-text search across days.

- `src/services/importExportService.ts`
  - Export: serialize `{ version, exportedAt, tasks, taskHistory, settings }` to JSON; save via dialog.
  - Import: choose JSON; validate `version`; merge strategy: append history; replace settings (with confirmation); merge active tasks (optional prompt) or skip if collision.

- `src/services/summaryScheduler.ts`
  - On app start/wake: schedule timers for next Monday 08:00 and next 1st 08:00 (local time) if enabled.
  - When fired: call `summaryService.generateWeekly/Monthly`, then notify with "View" action.

- `src/services/summaryService.ts`
  - `generateWeeklySummary(reference = now)` → prior Monday–Sunday, grouped by day.
  - `generateMonthlySummary(reference = now)` → previous calendar month, grouped by day.
  - Output Markdown with per-day lists and totals. Destination folder is configurable via settings (default app data; allow choosing Documents). Save to `.../weekly-YYYY-WW.md` and `.../monthly-YYYY-MM.md`.
  - If AI enabled, call `aiSummaryService` and append an "AI summary" section below the plain listing.

- `src/services/aiSummaryService.ts` (optional)
  - Provider-agnostic wrapper. Reads provider/key from settings.
  - `generatePolishedSummary({ period, range, plainMarkdown, style })`
  - Add network domains to Tauri capabilities as needed.

### State
- `src/state/historyStore.ts`
  - `days`, `selectedDay`, `items`, `search`, `loading`, `error`.
  - Actions: `loadDays`, `selectDay(day)`, `searchInDay(text)`, `searchAll(text)`.

- `src/state/settingsStore.ts` (thin convenience store)
  - `settings` cache, `loading`, `error`.
  - Actions: `loadSettings`, `updateSetting(key, value)` → persist via `settingsService`.

### UI
- Menu
  - `src/components/AppMenu.tsx`: accessible dropdown/popover opened from a "Menu" button in the header (replaces theme toggle button).
  - Sections:
    - Theme: Light/Dark toggle
    - History: Open History Viewer
    - Import/Export: Export JSON, Import JSON, Open data folder, Open Summaries folder
    - Settings: Reminder lead time, Start on login, Global hotkey, Run midnight clear now, Help/About
  - Integrations: calls into services and stores. Keep keyboard and screen reader friendly.

- History Viewer
  - `src/features/HistoryViewer.tsx` + `src/features/HistoryViewer.css`
  - Layout: Left calendar month grid (Luxon), right day list.
    - Calendar shows a dot or count for days with history (based on `days`).
    - Selecting a day loads and lists archived items grouped by `source_list` with counts.
    - Search input: filters within day; optional "Search all history".
  - Empty state: "No history yet" with guidance.
  - Keyboard: Arrow keys navigate calendar; Enter selects; Esc closes.

- Summary Viewer
  - `src/features/SummaryViewer.tsx` + `src/features/SummaryViewer.css`
  - Left: list of saved files (weekly/monthly). Right: Markdown preview.
  - Actions: Open in default editor, copy, delete (with confirm), Generate weekly now, Generate monthly now.

### Integration changes
- Replace header theme toggle in `src/App.tsx` with `AppMenu` trigger.
 - Use `settingsService` for theme persistence and unification: support `themeMode` (Auto follows system, plus Light/Dark). If unset, fallback to system preference.
 - Modify `src/services/notifications.ts` to read `reminderLeadMinutes` (fallback 15) and an independent `overdueWindowMinutes` (fallback 60). Apply windows:
   - Upcoming: `0 < diffMinutes <= reminderLeadMinutes`
   - Overdue: `-overdueWindowMinutes <= diffMinutes < 0`
 - Future enhancement: add notification "Snooze 5/10/15m" actions.
- Add Menu entries to trigger: History Viewer, Import/Export, Summary Viewer, Settings, Run midnight clear (calls existing manual trigger), Open folders.

### Import/Export format
```json
{
  "version": 1,
  "exportedAt": "2025-01-01T12:00:00Z",
  "tasks": [
    { "id": "task_...", "title": "...", "list": "TODAY|FUTURE", "sortIndex": 0, "hasTime": true, "scheduledAt": "...", "completed": false, "completedAt": null, "createdAt": "...", "updatedAt": "..." }
  ],
  "taskHistory": [
    { "id": "history_...", "sourceList": "TODAY|FUTURE", "title": "...", "completedAt": "...", "clearedOn": "YYYY-MM-DD", "createdAt": "..." }
  ],
  "settings": { "reminderLeadMinutes": 15, "theme": "light" }
}
```

### Scheduling details
- Weekly: Next Monday at 08:00 local; then +7 days each time.
- Monthly: Next 1st at 08:00 local; then next month (preserve time).
- Reschedule on app start and when the system wakes or system time changes (for both midnight clear and summaries).
- Catch-up on app start: if a scheduled weekly/monthly summary time was missed while the app was closed, generate immediately, then schedule the next occurrence.

### Scheduling & lifecycle hardening
- Midnight clear robustness: listen for OS wake/resume and system time changes; re-schedule the midnight timer to avoid drift.
- Summary scheduling: same wake/time-change handling; include catch-up generation on next start if missed.

## Tasks

### T1 – Settings foundation
- Add `settingsService.ts` and `settingsStore.ts`.
- Wire theme persistence with settings (keep `useThemeStore` as the UI source-of-truth, but hydrate from settings on init).
- Add getters for `reminderLeadMinutes` with default 15.

### T2 – App Menu
- Create `AppMenu.tsx` and styles; replace header theme button in `App.tsx` with a Menu button.
- Implement handlers: Theme toggle, open History Viewer, Import, Export, Open Data Folder, Open Summaries Folder, Settings, Run Midnight Clear Now, Help/About.

### T3 – History service and store
- Implement `historyService.ts` queries.
- Implement `historyStore.ts` with day list, selection, and search.

### T4 – History Viewer UI
- Build `HistoryViewer.tsx` with calendar month view and day list pane.
- Integrate search; show per-source counts; empty states.
- Add keyboard navigation and A11y labels.

### T5 – Notifications lead time
- Update `notifications.ts` to read `reminderLeadMinutes` and `overdueWindowMinutes`; adjust windows accordingly.
- Add minimal UI control in Settings within the Menu.

### T6 – Import/Export
- Implement `importExportService.ts` with versioned JSON.
- Add Menu actions for Import and Export; confirm on import.

### T7 – Summaries
- Implement `summaryService.ts` (week/month range queries; Markdown generation; file save; notify with "View").
- Implement `summaryScheduler.ts` to schedule weekly/monthly jobs, re-schedule on wake/time-change, and perform catch-up on start if missed.
- Implement `SummaryViewer.tsx` to browse and preview generated files, and provide "Generate weekly now" and "Generate monthly now" actions.
- Add destination folder selection (settings + folder picker) defaulting to app data, with an option to select Documents.

### T8 – AI summaries (optional)
- Implement `aiSummaryService.ts` with provider/key settings and a simple prompt that summarizes by day and highlights themes/outliers.
- Append AI output below plain summary when configured.

### T9 – Polish
- Keyboard support and ARIA roles for menu and viewers.
- Error handling and toasts; confirm dialogs.
- Documentation in README.

## Acceptance criteria
- History Viewer
  - Calendar shows indicators for days with archived tasks; selecting a day shows items with counts by `source_list`.
  - Search filters within a day; can search all history.
  - Read-only; no accidental mutation of history.
- Menu
  - Single menu replaces theme button; keyboard-accessible; includes Theme, History, Import/Export, Settings, Help.
  - Theme supports Auto/Light/Dark and persists via settings.
- Notifications
  - Reminder lead time is configurable; defaults to 15 minutes; reflected immediately on change.
  - Overdue window is configurable independently; default 60 minutes.
  - Snooze actions are noted as a later enhancement (not required for MVP).
- Import/Export
  - Export produces valid JSON with `version`; Import restores data correctly with confirmations.
- Summaries
  - Weekly summary at Monday 08:00 and monthly on 1st 08:00; files saved to the configured destination; notification with working "View" action; in-app viewer lists and previews files.
  - If scheduled time was missed while the app was closed, a catch-up summary is generated on next start.
  - In-app viewer provides "Generate weekly now" and "Generate monthly now" actions.
- AI (optional)
  - If configured, AI section appears; failures gracefully fallback to plain summary.

## Milestones
- M1: T1–T2 (Settings + Menu)
- M2: T3–T4 (History service/store + Viewer)
- M3: T5 (Configurable reminders)
- M4: T6 (Import/Export)
- M5: T7 (Summaries + Viewer + scheduling)
- M6: T8–T9 (AI integration + polish)

## Risks and notes
- Long-running timers in desktop apps can drift; always recompute on app start and wake.
- Import collisions: prefer append for history; prompt for tasks; backup DB before import.
- AI keys are user-provided; store locally; document privacy; consider redacting in UI.
- Keep performance in mind: lazy-load history days; paginate; virtualize long lists if needed.


