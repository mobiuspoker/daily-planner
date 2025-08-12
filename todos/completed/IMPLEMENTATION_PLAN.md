## Personal Task Planner – Implementation Plan (Windows, Tauri + React)

### Goals
- **Simple, elegant Windows desktop app** built with **React** UI and **Tauri** shell.
- **Two lists**: Today and Future. Add tasks, drag to sort, check off.
- **Daily reset**: checked tasks clear from Today/Future at local midnight but remain **browsable in history**.
- **Reminders**: optional time per task; **notify 15 minutes before**.
- **System tray** when minimized; **light/dark** themes; minimalist UI with a **serif font**.

### Why Tauri (and not Electron)
- **Lightweight** footprint, native bundling, good Windows support.
- First‑class APIs/plugins for **notifications**, **system tray**, **autostart**, **SQLite**.
- If you want the smallest memory use, Tauri is a good choice. No downside for this scope.

## Architecture

### Tech stack
- **Shell**: Tauri v2 (Rust core) with plugins: notification, tray, sql (SQLite), autostart, global-shortcut, fs, dialog, updater (optional).
- **UI**: React + TypeScript (Vite), Zustand for state, dnd-kit for drag-and-drop.
- **Persistence**: SQLite via `@tauri-apps/plugin-sql` (file DB in app data).
- **Time**: Luxon for robust local timezone handling and date math.
- **Styling**: CSS variables with light/dark themes (use `prefers-color-scheme` + manual toggle). Serif font via Google Fonts (e.g., "Literata" or "DM Serif Text").

### App structure (frontend)
- `src/` top-level
  - `state/` – Zustand stores, persistence glue
  - `db/` – SQL helpers (queries, migrations)
  - `components/` – UI building blocks
  - `features/` – Today, Future, History modules
  - `services/` – scheduling, notifications, tray integration, hotkeys, export/backup
  - `styles/` – tokens, themes, global styles

### Data model (SQLite)
```sql
-- tasks: active items in Today/Future (including completed ones until midnight clear)
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,
  list TEXT NOT NULL CHECK (list IN ('TODAY','FUTURE')),
  sort_index INTEGER NOT NULL,
  has_time INTEGER NOT NULL DEFAULT 0, -- 0/1
  scheduled_at TEXT,                  -- ISO string in local time or UTC; store UTC + tz name
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,                  -- ISO UTC
  created_at TEXT NOT NULL,           -- ISO UTC
  updated_at TEXT NOT NULL            -- ISO UTC
);

-- history: immutable record for cleared/completed tasks
CREATE TABLE IF NOT EXISTS task_history (
  id TEXT PRIMARY KEY,                -- same as original id or new UUID
  source_list TEXT NOT NULL,          -- TODAY/FUTURE
  title TEXT NOT NULL,
  completed_at TEXT,                  -- if completed
  cleared_on TEXT NOT NULL,           -- midnight clear date (local day boundary in UTC)
  created_at TEXT NOT NULL            -- original task creation
);

CREATE INDEX IF NOT EXISTS idx_tasks_list_sort ON tasks(list, sort_index);
CREATE INDEX IF NOT EXISTS idx_history_cleared ON task_history(cleared_on);
```

Notes
- Store times in UTC plus the local timezone identifier for accurate rendering. Persist `timeZone` once in settings and capture current.
- `sort_index` is a dense integer; maintain on drag end.

### Core behaviors
- **Add task**: to Today or Future. Optional time; if set, schedule a reminder event 15 minutes before.
- **Drag & drop**: reorder within a list; allow moving across lists (update `list`, recompute `sort_index`).
- **Complete**: toggles `completed`; visually moves to a “Completed today” section per list (collapsible), but remains until midnight.
- **Midnight clear**:
  - At local midnight: move all tasks that are `completed=1` to `task_history` (with `cleared_on` as that day), then delete them from `tasks`.
  - Optionally, also move uncompleted tasks from Today to Future? For now: keep uncompleted tasks where they are. (Simple rule.)
- **History view**: read-only list grouped by date; simple date picker or infinite scroll by day.
- **System tray**: minimize-to-tray; context menu: Show/Hide, Add Quick Task…, Exit; tray icon reflects theme.
- **Notifications**: when app is running (including tray), schedule timers; if closed, no notifications (documented). Suggest enabling **Start on login**.

### Scheduling strategy
- On app start/resume:
  - Compute next local midnight; schedule a single-shot timer to run clear.
  - For each task with time in the future, schedule an in-memory timer for (scheduled_at - 15 minutes). De-dupe on updates.
  - If the machine wakes from sleep or system time changes, re-scan and re-schedule.
- On add/edit/delete: update SQLite, then refresh timers.
- On clear run: transactionally move completed tasks to history, then delete them from `tasks`.

## UI/UX

### Visual language
- **Serif**: "Literata" or "DM Serif Text" for headings; system-serif or "Georgia" fallback; clean sans-serif for body if desired (optional).
- **Minimal** spacing, soft elevation, rounded corners. Keyboard-first.
- **Theme**: light/dark via CSS variables; auto-detect + toggle.

### Layout
- Header: Today and Future tabs or side-by-side columns (pick tabbed for compactness; column toggle optional).
- Quick add input at top of each list: supports natural time ("3pm", "14:30").
- Task item: checkbox, title, optional time chip, drag-handle, overflow menu (Edit, Move, Delete).
- Completed section per list collapsible below active tasks.
- History: date picker with list of cleared days; search by text.
- Overdue/soon highlighting: subtle accent for overdue tasks; gentle accent for tasks within next hour.

### Accessibility
- Full keyboard support: add (Enter), complete (Space), move (keyboard drag), delete (Del), navigate lists (Arrow keys).
- ARIA roles for drag-and-drop via dnd-kit.

## Notifications
- Use `@tauri-apps/plugin-notification`.
- Request permission on first use; show a sample notification.
- Payload: task title and time; actions: "Snooze 5m", "Mark done" (optional v2 action buttons).
- Edge cases: if 15-min point has already passed on app start, notify immediately with a “catch-up” notification (once).

## System Tray & Lifecycle
- Use `@tauri-apps/plugin-tray` for tray icon and menu.
- Minimize action hides window to tray; closing window defaults to hide-to-tray (Confirm on first time; preference in settings).
- Tray menu: Show/Hide, Add Quick Task…, Start on login (toggle), Exit.
- Use `@tauri-apps/plugin-autostart` to enable start on login.
- **Global quick-add hotkey**: register a system-wide shortcut (e.g., Ctrl+Shift+Space) via `@tauri-apps/plugin-global-shortcut` to open a lightweight quick-add modal even when the app is hidden/minimized.

## State management
- **Zustand** stores for UI state and filters; database remains source-of-truth.
- Keep stores thin; all mutations go through services that persist to SQLite, then refresh store slices.

## Error handling
- Wrap DB operations in try/catch; surface non-blocking toasts.
- On DB initialization failure, present a non-destructive recovery flow (new DB; keep old file).

## Project setup

### Prereqs
- Rust toolchain (stable), Node LTS, PNPM or NPM, Visual Studio Build Tools (Windows), Microsoft Edge WebView2 Runtime.

### Scaffolding (pick one)
1) Create with Tauri app template (React + TS)
```sh
# using pnpm (recommended)
pnpm create tauri-app@latest . -- --template react-ts

# or with npm
npm create tauri-app@latest . -- --template react-ts
```

2) Add Tauri to existing Vite React app
```sh
# inside the React app directory
pnpm add -D @tauri-apps/cli
pnpm tauri init
```

### Install plugins and libs
```sh
pnpm add @tauri-apps/plugin-notification @tauri-apps/plugin-tray @tauri-apps/plugin-autostart @tauri-apps/plugin-sql @tauri-apps/plugin-global-shortcut @tauri-apps/plugin-fs @tauri-apps/plugin-dialog
pnpm add zustand @dnd-kit/core @dnd-kit/sortable luxon
```

### Minimal integration tasks
- Configure plugins in Tauri `tauri.conf.json`/`tauri.conf.json5`.
- Initialize SQLite connection on app start and run migrations.
- Build `TaskService` (add/edit/delete/complete/move/scheduleTimers).
- Build `SchedulerService` (midnight timer + per-task reminders) using Tauri timers.
- Implement Today/Future UIs with dnd-kit.
- Implement History screen.
- Add tray and minimize-to-tray behavior.
- Implement light/dark theme and font load.
- Register global quick-add hotkey; implement a minimal quick-add modal accessible from hotkey and tray.
- Implement export/backup (JSON export and import) using FS + dialog plugins.

## Milestones

### M1 – Skeleton (day 1–2)
- Scaffolding, theme tokens, font, basic layout, Zustand store, empty lists, SQLite schema + migrations.

### M2 – CRUD + Sort (day 3–4)
- Add/edit/delete tasks, drag reorder within a list, move between lists, persistence.

### M3 – Complete + Midnight clear (day 5)
- Complete/uncomplete; collapsible completed section; midnight clear job into `task_history`.

### M4 – Reminders (day 6)
- Task time parsing, schedule 15-min notifications, catch-up on resume.

### M5 – Tray + Autostart (day 7)
- Minimize-to-tray, tray menu actions, start-on-login option.

### M6 – History (day 8)
- History view grouped by date, simple search.

### M7 – Quick Add + Backup (day 9)
- Global quick-add hotkey and modal; tray "Quick Add" action.
- Export/backup to JSON and import restore.
- Overdue/soon visual accents.

### M8 – Polish (day 10)
- Keyboard navigation, animations, settings, QA on dark mode.

## Open decisions / assumptions
- Uncompleted tasks at midnight: stay in their list. If you prefer auto-move to Future, we can add a setting.
- Notifications fire only while the app is running (including tray). For true background delivery when fully closed, Windows Scheduled Tasks integration would be needed (out-of-scope for MVP).
- Time parsing: simple HH:mm / h[:mm] am/pm; can expand later.

## Acceptance checklist
- Add, reorder, move, and complete tasks in both Today and Future.
- Completed tasks clear at local midnight; appear in History.
- Set task time; receive notification 15 minutes prior.
- App minimizes to system tray; tray menu works; app supports light/dark; serif typography.
- Works offline; starts quickly; low memory footprint.
- Global hotkey opens quick-add modal even when minimized.
- Export tasks/history to JSON and import successfully.
- Overdue and soon tasks have subtle, accessible highlights.

## Next steps
1) Initialize the project with the template.
2) Add plugins and wire up DB + migrations.
3) Implement Today list end-to-end (CRUD, DnD, complete, timers).
4) Copy patterns for Future; add History.
5) Tray + Autostart; quick-add hotkey + export/backup; polish themes and accessibility.


