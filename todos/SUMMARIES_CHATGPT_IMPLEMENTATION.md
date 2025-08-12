## Summaries (Weekly/Monthly) with ChatGPT – Implementation Plan

### Goal
Generate plain Markdown summaries from `task_history` for weekly (Mon 08:00) and monthly (1st 08:00) ranges, optionally augment them with a polished ChatGPT summary, save files to a configurable folder, show notifications with a quick “View” action, and provide an in‑app Summary Viewer with “Generate now” buttons. Includes catch‑up if the app was closed at schedule time.

### Scope of this plan
- Implement summaries end‑to‑end with ChatGPT first (OpenAI API). Anthropic can reuse the same interface later.
- Reuse existing DB and services. Add minimal new services and UI.

---

## Files to add/update

### New services
- `src/services/historyService.ts`
  - `getRange(startISO: string, endISO: string)` → return `task_history` rows where `cleared_on` is in the inclusive `[startISO, endISO]` range, ordered by `cleared_on ASC`.

- `src/services/summaryService.ts`
  - `generateWeeklySummary(reference = DateTime.local())`
  - `generateMonthlySummary(reference = DateTime.local())`
  - Helpers: `formatPlainMarkdown(rangeRows)`, `saveSummaryFile(markdown, { type: 'weekly' | 'monthly', reference, folder })`.

- `src/services/aiSummaryService.ts`
  - Provider: `openai`
  - `generatePolishedSummary({ period, startISO, endISO, plainMarkdown, model, maxTokens, temperature })`
  - Uses `fetch('https://api.openai.com/v1/chat/completions', ...)` with bearer key from settings.

- `src/services/summaryScheduler.ts`
  - `setupSummaryScheduler()` – compute next weekly and monthly run times from settings `summaryTime` (default `08:00`).
  - Schedule timers; on fire: call `summaryService` + optional `aiSummaryService`, then notify.
  - Catch‑up on app start: if next run was earlier than now (and not yet generated), generate immediately then schedule next.
  - Re‑schedule on OS wake/time‑change.

### Existing services to update
- `src/services/notifications.ts`
  - No direct changes needed for summary generation, but will be used to notify completion with a "View" action (or just a simple notification that opens the viewer).

- `src/services/settingsService.ts` (new file if not present)
  - Generic get/set wrappers on `settings` table with JSON serialization for numbers/booleans.

### New UI
- `src/features/SummaryViewer.tsx` + `src/features/SummaryViewer.css`
  - Left: file list (weekly/monthly) discovered from the configured summaries folder.
  - Right: Markdown preview pane.
  - Buttons: Generate weekly now, Generate monthly now, Open in editor, Copy, Delete.

### Menu integration
- `src/components/AppMenu.tsx`
  - Add entries: "Summaries → Open Viewer", "Generate Weekly Now", "Generate Monthly Now".

### Tauri capabilities (src-tauri)
- Update `src-tauri/capabilities/default.json` to ensure filesystem permissions cover:
  - AppData read/write (already present)
  - If user selects Documents: allow writing/reading under Documents (add appropriate fs permissions/scopes)
  - Network: ChatGPT calls can use window `fetch`; if restricted, add HTTP permissions or use a backend command. For MVP, plan to call from renderer with standard fetch.

---

## Settings
Use `settings` table via `settingsService` with JSON‑serialized values where needed.
- `summaryWeeklyEnabled`: boolean (default `true`)
- `summaryMonthlyEnabled`: boolean (default `true`)
- `summaryTime`: string `HH:mm` (default `08:00` local)
- `summaryDestinationFolder`: string path (default app data summaries dir, e.g., `{appData}/Summaries`)
- `aiProvider`: `"openai" | "none"` (default `"none"`)
- `aiApiKey`: string (masked in UI; not exported by default)
- `aiModel`: string (default `"gpt-4o-mini"` or `"gpt-4o"`)
- `aiMaxTokens`: number (default 800)
- `aiTemperature`: number (default 0.3)

Notes:
- Do not include `aiApiKey` in exports unless user explicitly opts in.
- `summaryTime` applies to both weekly and monthly schedules.

---

## Range definitions
- Weekly summary window: previous Monday 00:00 local to Sunday 23:59:59 local relative to `reference` (the Monday 08:00 run summarizes the prior Monday–Sunday).
- Monthly summary window: previous calendar month (1st 00:00 to last day 23:59:59 local) relative to the 1st 08:00 run.

We query by `cleared_on` (local date string `YYYY-MM-DD`) inclusive bounds converted to ISO date strings.

---

## Implementation steps

### Step 1: historyService.getRange
- Implement `getRange(startISO: string, endISO: string)` using SQL:
  - `SELECT * FROM task_history WHERE cleared_on >= ? AND cleared_on <= ? ORDER BY cleared_on ASC`
  - Map rows to a TS interface `{ id, sourceList, title, completedAt, clearedOn, createdAt }`.

### Step 2: summaryService (plain Markdown)
- Add helpers to compute weekly/monthly ranges from a `reference` date.
- Fetch rows via `historyService.getRange`.
- Group by `clearedOn` ascending; within day, group by `sourceList` and count.
- Build plain Markdown:
  - Title with range, per‑day headings (e.g., `## 2025-01-22 (Wed)`), bullet lists of titles, and totals.
  - Keep under a reasonable size to fit AI token limits; truncate very long days if needed.
- Save file via `fs` into `{summaryDestinationFolder}/weekly-YYYY-WW.md` or `monthly-YYYY-MM.md`.

### Step 3: aiSummaryService (ChatGPT)
- Read `aiProvider`, `aiApiKey`, `aiModel`, `aiMaxTokens`, `aiTemperature` from settings.
- If provider is `openai` and key present:
  - POST `https://api.openai.com/v1/chat/completions`
  - Body example:
    ```json
    {
      "model": "gpt-4o-mini",
      "messages": [
        { "role": "system", "content": "You are an assistant that writes concise, polished weekly/monthly summaries of to-do completions." },
        { "role": "user", "content": "Summarize the following completions by day. Highlight major themes and notable outliers. Keep it succinct.\n\n" }
      ],
      "max_tokens": 800,
      "temperature": 0.3
    }
    ```
  - Append the plain Markdown (or a condensed JSON structure) after the prompt header.
  - Append the model’s response under an `### AI Summary` section beneath the plain listing and save.
- Failure handling: if the API fails, keep the plain summary and log a warning.

Security notes:
- Call from renderer using `fetch` and a stored key (single‑user desktop). Document local storage and privacy.
- If needed later, move to a Rust command to avoid exposing the key to front‑end code.

### Step 4: summaryScheduler
- On app start: load settings, compute next weekly/monthly run times from `summaryTime`.
- Schedule `setTimeout` for the next run of each enabled summary; after firing, schedule the subsequent run.
- Add a lightweight `setInterval` (e.g., every 1–2 minutes) to detect time changes or missed runs; also listen for OS resume/time‑change if available and re‑compute.
- Catch‑up: if `now` > scheduled time and no file exists for the expected range, generate immediately.
- On success: send a notification "Weekly summary generated" with an action to open the Summary Viewer.

### Step 5: Summary Viewer
- Left pane: read the summaries directory, list files grouped by `weekly`/`monthly` with newest first.
- Right pane: render Markdown preview of the selected file.
- Buttons:
  - Generate weekly now → calls `summaryService.generateWeeklySummary()`.
  - Generate monthly now → calls `summaryService.generateMonthlySummary()`.
  - Open in editor (shell open), Copy content, Delete (confirm).

### Step 6: Menu integration
- In `AppMenu`, add entries:
  - Summaries → Open Viewer
  - Generate Weekly Now
  - Generate Monthly Now
  - Settings → choose destination folder, set `summaryTime`, toggle weekly/monthly.

### Step 7: Capabilities and paths
- Ensure `fs` capabilities allow reading/writing the configured folder:
  - AppData path is already allowed (present permissions).
  - If user chooses Documents, add corresponding FS permissions/scopes.
- Network: If `fetch` from renderer is limited by CSP, update Tauri config to allow `https://api.openai.com` or route via a Tauri command.

### Step 8: Testing
- Unit‑like tests (manual):
  - Seed history rows for a past week and month; run `generateWeeklySummary`/`generateMonthlySummary`; inspect files.
  - Toggle AI off/on with a test key; verify AI section appends and failures fall back to plain summary.
  - Change destination folder to Documents; verify files are created and the viewer lists them.
  - Adjust `summaryTime`, enable/disable weekly/monthly, restart app; verify scheduling and catch‑up.

---

## Acceptance checklist (summaries only)
- Weekly summary is generated at Monday `summaryTime` (default 08:00), monthly on 1st `summaryTime`.
- Summaries are saved to the configured folder with consistent names (`weekly-YYYY-WW.md`, `monthly-YYYY-MM.md`).
- Notification appears with a working "View" action.
- Summary Viewer lists files, previews Markdown, and supports Generate‑now/Open/Copy/Delete.
- ChatGPT integration adds an "AI Summary" section when enabled; errors do not block plain summary.
- Catch‑up creates missed summaries on next app start.
- Permissions allow saving to AppData and optionally Documents; network access to OpenAI works (or is documented and configured).


