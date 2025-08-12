## T7/T8 – Summaries and AI Integration: Implementation Plan

This plan completes T7 (Summaries) and T8 (AI summaries) from `todos/HISTORY_MENU_SUMMARIES_PLAN.md`, aligned with the current codebase to avoid duplication.

### Inventory (what already exists)
- History data access: `src/services/historyService.ts` provides `getRange(startISO, endISO)` and day helpers.
- Settings: `src/services/settingsService.ts` with keys for `summaryWeeklyEnabled`, `summaryMonthlyEnabled`, `summaryTime`, `summaryDestinationFolder`, `aiProvider`, `aiApiKey`.
- File I/O and dialogs: `@tauri-apps/plugin-fs` (`writeTextFile`, `readTextFile`, `mkdir`) and `@tauri-apps/plugin-dialog` are already used in `importExportService.ts`.
- Notifications: `src/services/notifications.ts` is set up and used in `src/App.tsx`.
- Scheduler precedent: `src/services/midnightClear.ts` uses setTimeout for daily timer; provides manual `runMidnightClear()`.
- UI entry points:
  - App already routes to a Summaries placeholder in `src/App.tsx` via `onOpenSummaries()`.
  - App menu already has “Open Summaries Folder” and shows Summaries view (`src/components/AppMenuSimple.tsx`).

No existing `summaryService.ts`, `summaryScheduler.ts`, `SummaryViewer.tsx`, or `aiSummaryService.ts` yet.

---

## T7 – Summaries (service, scheduler, viewer)

### 1) Summary service
Create `src/services/summaryService.ts` to generate and save Markdown summaries.

- Public API
  - `generateWeeklySummary(reference: Date = new Date())`
  - `generateMonthlySummary(reference: Date = new Date())`
  - `listSummaryFiles(): Promise<Array<{ path: string; name: string; type: 'weekly'|'monthly'; createdAt?: string }>>`
  - `openSummaryFile(path: string)` – open in system editor via `plugin-shell` `explorer` on Windows.
  - `deleteSummaryFile(path: string)` – remove file.
  - `getDestinationFolder(): Promise<string>` – resolve folder from settings or default app data subfolder.

- Implementation notes
  - Date math: use Luxon (already in project) to compute:
    - Weekly range: prior Monday 00:00 through prior Sunday 23:59 (local). Persist as inclusive range of `cleared_on` ISO dates. File name `weekly-YYYY-WW.md` (ISO week numbering).
    - Monthly range: previous calendar month. File name `monthly-YYYY-MM.md`.
  - Data: call `historyService.getRange(startISO, endISO)`; do not reimplement queries.
  - Markdown: group by `clearedOn` day, then by `sourceList` with counts; include totals. Keep plain listing format simple and deterministic for diffability.
  - Destination folder: use `getSetting('summaryDestinationFolder')` or fall back to `appDataDir()/summaries`. Ensure folder exists via `mkdir(path, { recursive: true })`.
  - Save: `writeTextFile(path, markdown)` using the chosen file name format.
  - Return: `{ path, name, type, createdAt, plainMarkdown }` for UI/notification use.
  - Optional view action: for Windows, `Command.create('explorer', [path]).execute()` opens the file.
  - Notifications: send a simple notification via `@tauri-apps/plugin-notification` after save.

### 2) Summary scheduler
Create `src/services/summaryScheduler.ts` to schedule weekly/monthly jobs.

- Public API
  - `setupSummaryScheduler()` – call on app start.
  - `stopSummaryScheduler()` – clear timers on shutdown.
  - `generateWeeklyNow()` and `generateMonthlyNow()` – convenience wrappers for UI buttons.

- Scheduling behavior
  - Read `summaryWeeklyEnabled`, `summaryMonthlyEnabled`, and `summaryTime` (`HH:mm`) from settings.
  - Compute next fire times:
    - Weekly: next Monday at configured time (local). When it fires, schedule +7 days.
    - Monthly: next 1st at configured time (local). When it fires, schedule next month (preserve time).
  - Catch-up on start: if the scheduled time was missed while the app was closed, generate immediately, then schedule the next occurrence.
    - Heuristic without new settings keys: check for the existence of the expected prior weekly/monthly file. If missing and now is after the prior scheduled time, generate.
  - Resilience: similar to `midnightClear`, rely on single-shot `setTimeout` and recompute after fire. Add a lightweight resync interval (e.g., every 15 minutes) that recalculates and resets the next timers in case of system sleep/time-change.

Notes: No OS wake/time-change hooks currently exist in the project; the periodic rescheduler avoids drift without new native integration.

### 3) Summary Viewer UI
Create `src/features/SummaryViewer.tsx` and `src/features/SummaryViewer.css`.

- Layout
  - Left: list of summary files (weekly/monthly), newest first.
  - Right: Markdown preview of selected file.
  - Top actions: “Generate weekly now”, “Generate monthly now”, “Open in editor”, “Copy”, “Delete”, and “Choose destination folder…”.

- Data operations
  - List files via `summaryService.listSummaryFiles()`. For the default app data folder, current FS capabilities are sufficient. If a custom folder is chosen, ensure we still operate on that path.
  - Open in editor: `summaryService.openSummaryFile(path)`.
  - Copy: `navigator.clipboard.writeText` (webview clipboard). If needed later, we can add `@tauri-apps/plugin-clipboard`.
  - Delete: confirm then `summaryService.deleteSummaryFile(path)` and refresh the list.
  - Choose destination folder: open a directory picker, persist to `summaryDestinationFolder` via `settingsService.setSetting`, then refresh the list.

- Integrations
  - Wire to App: in `src/App.tsx`, replace the Summaries placeholder with `<SummaryViewer />` when `showSummaries` is true.
  - App Menu: already navigates to Summaries and can open the folder.

- Styling and A11y
  - Follow `todos/UI_STYLE_GUIDE.md` (paper aesthetic, serif content, sage accents). Keyboard focus states and ARIA labels for lists and actions.

### 4) Settings UI (minimal)
- Extend `src/components/SettingsModal.tsx` to include:
  - Toggles for “Enable weekly summary” and “Enable monthly summary”.
  - Time picker or dropdown for “Summary time” (`08:00` default, offer common values).
  - Display the current destination folder and a “Change…” button (uses the same directory picker as in Summary Viewer).

This reuses the existing settings store and persists via `useSettingsStore.updateSetting`.

### 5) Tauri capabilities
- Current `src-tauri/capabilities/default.json` already includes general FS read/write and appdata read/write recursive.
- For opening files with the system editor on Windows, `src-tauri/capabilities/shell.json` allows `explorer` execution and is already used in the App Menu. Reuse this for `openSummaryFile`.
- If later we add non-appdata folder operations with stricter FS capability scopes, we may need to extend FS permissions to read/write that folder path. For MVP, prefer app data `summaries/` as default to avoid capability changes.

### 6) Minimal acceptance test plan (T7)
- Toggle weekly/monthly on; set time to a near future minute; verify one-time fire generates the correct file and sends a notification. Verify “Generate now” works regardless of schedule.
- Weekly file name like `weekly-2025-03.md` (ISO week), monthly `monthly-2025-01.md` (month index). Contents grouped by day with totals.
- Summary Viewer lists files, previews, opens in editor, copies, deletes; folder selection persists.
- Catch-up: close app past the scheduled time; on reopen, the missing summary is generated once, next schedule is set forward.

---

## T8 – AI Summaries

### 1) AI service
Create `src/services/aiSummaryService.ts`.

- Public API
  - `generatePolishedSummary(args: { period: 'weekly'|'monthly'; range: { startISO: string; endISO: string }; plainMarkdown: string; style?: 'concise'|'detailed' }): Promise<string>`

- Provider selection
  - Read `aiProvider` (`'none'|'anthropic'|'openai'`) and `aiApiKey` from settings.
  - If provider is `'none'` or key is missing, short-circuit with an empty string.

- Requests (baseline implementations)
  - OpenAI: `fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer …', 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: 'You are an assistant…' }, { role: 'user', content: prompt }] }) })`
  - Anthropic: `fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': '…', 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'claude-3.5-sonnet', max_tokens: 800, messages: [{ role: 'user', content: prompt }] }) })`
  - Prompt: include period, local date range, and the plain Markdown listing; ask for a brief “AI Summary” section with themes, highlights, and outliers; no task IDs, no speculative content.
  - Error handling: timeouts and non-200 responses should return `""` so the caller can gracefully omit the AI section.

Notes: We can use `fetch` directly from the WebView; if we later switch to `@tauri-apps/plugin-http` for CORS/better control, we’ll add domain-scoped capabilities for `api.openai.com` and `api.anthropic.com`.

### 2) Integrate AI into summary generation
- In `summaryService.ts`, after producing plain Markdown and before saving, conditionally call `aiSummaryService.generatePolishedSummary(...)`. If non-empty, append:

```
\n\n## AI Summary\n\n[provider]:\n\n<returned text>
```

- Failure should not block file creation; log and proceed with plain summary.

### 3) Settings UI (minimal)
- Extend `SettingsModal` with:
  - Provider dropdown: None (default), OpenAI, Anthropic.
  - API key input (masked) with save/clear.
  - Brief privacy note (local-only storage; requests only include the generated plain summary text).

### 4) Acceptance test plan (T8)
- With provider None: summaries generate without an AI section.
- With an invalid key: summary still saves; AI section omitted.
- With a valid key: summary contains an AI section appended; quick regenerate buttons include AI when configured.

---

## File-by-file changes

- Add `src/services/summaryService.ts` (new)
- Add `src/services/summaryScheduler.ts` (new)
- Add `src/services/aiSummaryService.ts` (new, optional at runtime)
- Add `src/features/SummaryViewer.tsx` and `src/features/SummaryViewer.css` (new)
- Edit `src/App.tsx`: import and use `SummaryViewer`; call `setupSummaryScheduler()` during init
- Edit `src/components/SettingsModal.tsx`: add weekly/monthly toggles, summary time, and AI provider/key controls
- Optional: extend `src-tauri/capabilities` if later broadening FS/network scopes beyond appdata and standard fetch

## Milestones and estimates
- T7 Service + Scheduler: 0.5–1 day (including catch-up and notifications)
- T7 Viewer UI: 0.5–1 day (list/preview/actions/folder picker)
- T8 AI service + integration: 0.5 day (fetch-based, minimal UI)
- QA + docs: 0.5 day

## Risks and mitigations
- Timer drift or system sleep: periodic rescheduler (15 min) to recompute next triggers.
- Custom folder permissions: keep default to app data; if user selects another folder, verify read/write; document that elevated FS capabilities may be required.
- Provider API changes/rate limits: handle errors, timeouts, and rate-limit responses gracefully; keep AI optional.

## Acceptance checklist (mapped to `HISTORY_MENU_SUMMARIES_PLAN.md`)
- Weekly/monthly summaries are generated at the configured times and saved to the configured folder; notification fires with a clear message.
- Catch-up generation on app start if a scheduled time was missed.
- In-app Summary Viewer lists, previews, opens, copies, deletes, and can “Generate now” for week/month.
- Destination folder selection persists and is used by both generator and viewer.
- If AI is configured, a concise “AI Summary” section is appended; on failure, plain summary is still saved.


