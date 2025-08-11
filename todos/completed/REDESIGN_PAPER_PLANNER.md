## Modern Paper Planner UI – Implementation Plan

### Goals
- Add subtle paper aesthetics while keeping modern interactions.
- Ruled lines appear only behind the task lists (not headers).
- Tasks visually sit on the lines and stay aligned even with multi-line content.

### Key Ideas
- Use a baseline grid defined by a CSS custom property (e.g., `--paper-line-step`).
- Render lines on the task list content area via a positioned pseudo-element.
- Convert the task list content into a CSS grid with row height equal to the line step.
- Measure each task’s rendered height and span the appropriate number of grid rows so items snap to the grid without overlap.
- Simplify task visuals (no solid card background) so the paper lines are visible “behind” the text.

---

## 1) Design Tokens and Fonts

### Tokens to add in `src/styles/globals.css`
- Light theme additions under `:root`:
  - `--bg-paper: #fafaf9;`
  - `--line-color: #e8e8e8;`
  - `--text-primary: #2d2d2d;`
  - `--accent-blue: #4a5d7a;`
  - `--paper-line-step: 28px;`  (baseline leading; tweak 26–30px as preferred)
  - `--paper-line-thickness: 1px;`

- Dark theme in `[data-theme="dark"]`:
  - `--bg-paper: #1b1c1e;`
  - `--line-color: #2a2c31;`  (very subtle)
  - `--text-primary: #e7e7e7;`
  - `--accent-blue: #8da3c2;`

### Typography
- Already importing `Inter` and `Literata` in `index.html`.
- Keep `Inter` (`--font-sans`) for UI chrome and controls.
- Ensure task text uses `--font-serif`:
  - Update `.task-title`, `.task-notes` to `font-family: var(--font-serif); color: var(--text-primary);`.
  - Keep badges/buttons/time chips in `--font-sans`.

---

## 2) Paper Background (lines only behind tasks)

Scope lines strictly to the task content area, not headers or outside chrome.

### Container
- In `src/features/TaskList.css`, keep the existing list card styling but change its background to paper:
  - `.task-list { background-color: var(--bg-paper); box-shadow: var(--shadow-md); border-radius: var(--radius-lg); }`

### Lines layer
- Render lines via a pseudo-element on `.task-list-content` so it sits behind tasks:

```css
.task-list-content {
  position: relative;
  display: grid;                 /* for grid alignment (see section 3) */
  grid-auto-rows: var(--paper-line-step);
  gap: 0;                        /* lines are our separators */
}

.task-list-content::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: repeating-linear-gradient(
    to bottom,
    var(--line-color),
    var(--line-color) var(--paper-line-thickness),
    transparent var(--paper-line-thickness),
    transparent var(--paper-line-step)
  );
  z-index: 0;                    /* behind tasks */
}
```

Notes
- By applying to `.task-list-content` only, headers and container chrome remain line-free.
- If needed, add `padding-top` in `.task-list-content` to adjust the first line’s phase under the input.

---

## 3) Keep Everything Aligned to Lines

Best-practice approach that works for single- and multi-line tasks:

1) Make the content area a grid with row height equal to the line step (`grid-auto-rows: var(--paper-line-step)`).
2) For each task item, measure its rendered height and compute how many rows it should span: `rows = Math.max(1, Math.round(height / lineStep))`.
3) Set `style={{ ['--rows' as any]: rows }}` on the task root, and in CSS use `grid-row: span var(--rows);`.

### Minimal code changes (where)
- `src/features/TaskList.css`: set grid on `.task-list-content` as above.
- `src/components/TaskItem.tsx`: add a `ref` and `useLayoutEffect` to measure height and set a CSS variable `--rows` on the item element.

### CSS for task items
```css
.task-item {
  grid-row: span var(--rows, 1);
  position: relative;
  z-index: 1;                  /* above the line layer */
  display: grid;
  grid-template-columns: auto 1fr auto; /* checkbox | text | handle */
  align-items: center;
  gap: var(--spacing-md);
  padding: 0 var(--spacing-md); /* vertical padding handled by line height */
  min-height: var(--paper-line-step);
  background: transparent;     /* let paper show through */
  border: 0;
  margin: 0;                   /* items stack flush on the grid */
}

.task-title { 
  font-family: var(--font-serif); 
  line-height: var(--paper-line-step);
  color: var(--text-primary);
}

.task-notes {
  font-family: var(--font-serif);
  color: var(--color-text-secondary);
}
```

### Measuring rows in `TaskItem`
- Pseudocode in `TaskItem.tsx`:

```ts
const rootRef = useRef<HTMLDivElement>(null);
useLayoutEffect(() => {
  const el = rootRef.current;
  if (!el) return;
  const line = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--paper-line-step')) || 28;
  const resize = () => {
    const height = el.getBoundingClientRect().height;
    const rows = Math.max(1, Math.round(height / line));
    el.style.setProperty('--rows', String(rows));
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  return () => ro.disconnect();
}, []);
```

Attach `ref={rootRef}` to the `.task-item` container.

This keeps items snapped to the baseline grid regardless of wrapping text or visible notes/time chips.

Optional: add a small vertical `padding-block` that is an integer multiple of the line step if you want extra breathing room between rows.

---

## 4) Task Styling Adjustments

### Checkbox as a pen-like circle
```css
.task-checkbox {
  width: 1.25rem; height: 1.25rem;
  border-radius: 999px;
  border: 2px solid var(--color-border);
  background: transparent;
  color: var(--accent-blue);
}

.task-item.completed .task-checkbox {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
  color: white;
}
```

### Completed tasks
```css
.task-item.completed { opacity: 0.7; }
.task-item.completed .task-title {
  text-decoration: line-through;
  text-decoration-color: color-mix(in oklab, var(--text-primary) 50%, transparent);
}
```

### Drag handle and overlay
- Keep the handle as-is; ensure the drag overlay height matches measured rows:
  - When rendering the drag overlay `TaskItem`, carry over the last computed `--rows` as an inline style if available.

---

## 5) Color mapping and surfaces

- Use `--bg-paper` for `.task-list` background.
- Keep headers and app shell using existing `--color-bg` and `--color-bg-secondary` so the paper area stands out subtly.
- Update chips/badges to use `--accent-blue` where appropriate (e.g., time chip border/text) but keep contrast accessible.

---

## 6) Spacing and Rhythm

- Ensure vertical spacing near the header and input is a multiple of `--paper-line-step`:
  - `.task-list-header { margin-bottom: calc(var(--paper-line-step) * 0.5); }` (tune visually)
  - `.add-task-input { margin-bottom: calc(var(--paper-line-step) * 0.5); }`
- Within `.task-list-content`, avoid arbitrary margins; let the grid (row height) control rhythm.

---

## 7) Glassmorphism for Modals (keep modern touch)

- In `src/components/QuickAddModal.css`, tweak modal surface:
  - Use a semi-transparent surface: `background-color: color-mix(in oklab, var(--color-bg) 85%, transparent);`
  - Add `backdrop-filter: blur(8px);` and subtle border: `1px solid color-mix(in oklab, var(--color-border) 60%, transparent);`
  - Retain existing animations.

---

## 8) Drag-and-Drop Grid Snapping (optional)

For perfect movement along lines, add a custom dnd-kit modifier that snaps translateY to multiples of `--paper-line-step`.
- This is optional because the grid layout already keeps resting positions aligned.
- If added, it improves perceived alignment while dragging.

---

## 9) Step-by-Step Edits

1) Tokens
   - Add new variables to `src/styles/globals.css` for light and dark themes.

2) Container and lines
   - Update `src/features/TaskList.css`:
     - `.task-list { background-color: var(--bg-paper); }`
     - Add the `.task-list-content` grid and `::before` lines code from section 2.

3) Task items
   - Update `src/components/TaskItem.css`:
     - Remove card background and border; make background transparent.
     - Set grid-based layout and `min-height: var(--paper-line-step)`.
     - Set serif typography for `.task-title` and `.task-notes`.
     - Circle checkbox style.

4) Measure rows
   - Update `src/components/TaskItem.tsx`:
     - Add `ref` and `useLayoutEffect` to compute and set `--rows` on the root element; apply `ref`.
     - Ensure the drag overlay `TaskItem` copies `--rows` if available.

5) Spacing
   - Nudge margins in `TaskList.css` and `AddTaskInput.css` to be multiples or halves of `--paper-line-step` for a clean phase.

6) Modal polish
   - Apply glassmorphism adjustments to `QuickAddModal.css` as described.

---

## 10) QA Checklist
- Lines are visible only behind `.task-list-content` areas; headers remain clean.
- Tasks align to lines at rest, including multi-line tasks and those with notes/time chips.
- Dragging preserves perceived alignment; dropping snaps back perfectly.
- Serif font appears on task text and headers; sans-serif remains on UI controls.
- Light and dark themes have appropriately subtle line colors and accessible contrast.
- Completed tasks have soft strikethrough and fade.

---

## 11) Rollout Notes
- Introduce the change behind a small feature flag if desired (CSS class on the `body` like `paper-theme`).
- Test on different DPIs and Windows font scaling; adjust `--paper-line-step` if needed.
- Keep all changes CSS-first; the only JS addition is the small measurement code in `TaskItem` to maintain grid alignment.


