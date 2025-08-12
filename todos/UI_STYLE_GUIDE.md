# UI Style Guide - Task Planner

## Design Philosophy
This app follows a **paper-like aesthetic** inspired by traditional paper planners. The design emphasizes minimalism, readability, and a tactile feel without relying on shadows or heavy visual effects.

## Typography

### Font Families
- **Serif (`var(--font-serif)`)**: 'Literata', Georgia, serif
  - Used for: User-interactive content
  - Examples: Task titles, input fields, button labels, dropdown options, modal titles
  
- **Sans-serif (`var(--font-sans)`)**: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif
  - Used for: System/meta information
  - Examples: Timestamps, section headers (uppercase), descriptions, help text, counts

### Font Sizes
- **Main title**: 1.75rem (date header)
- **Section headers**: 1.25rem - 1.5rem
- **Body text**: 1rem (default)
- **Labels**: 0.9375rem
- **Meta text**: 0.75rem - 0.875rem
- **Small uppercase headers**: 0.75rem

## Color Palette

### Core Colors
- **Paper background**: `var(--bg-paper)` (#fcfcfb light / #181818 dark)
- **Line color**: `var(--line-color)` (#e5e5e3 light / #2a2a2a dark)
- **Primary text**: `var(--text-primary)` (#2d2d2d light / #f1f1f1 dark)

### Accent Colors (No Blue!)
- **Sage green** `var(--ink-sage)` (#7a8471 light / #6b7265 dark) - Primary accent for selections, completions
- **Terracotta** `var(--ink-terracotta)` (#b08882 light / #8a6b66 dark) - Warnings, overdue items
- **Amber** `var(--ink-amber)` (#c4a572 light / #9a8362 dark) - Items due soon

### System Colors
- **Success**: `var(--color-success)` (#51cf66) - Rarely used
- **Danger**: `var(--color-danger)` (#ff6b6b) - Errors, delete actions
- **Text secondary**: `var(--color-text-secondary)` - Muted text

## Visual Effects

### Shadows
**NO SHADOWS** - This is crucial to the paper aesthetic. Instead of shadows:
- Use borders with `var(--line-color)`
- Use subtle background color changes for depth

### Borders
- Default: `1px solid var(--line-color)` or `var(--color-border)`
- Border radius: `var(--radius-md)` (0.5rem) for most elements
- Small elements: `var(--radius-sm)` (0.25rem)

### Focus States
**NO BLUE FOCUS RINGS** - Instead:
- Input fields: Keep border, no outline, no glow
- Buttons: Use opacity and scale transforms
- Dropdowns: Border color stays consistent

### Hover States
- **Buttons/Icons**: 
  - opacity: 0.7 → 1
  - transform: scale(1.05)
- **List items**: 
  - background: rgba(0, 0, 0, 0.02) light mode
  - background: rgba(255, 255, 255, 0.02) dark mode
- **Interactive elements**: Never use blue, use sage green for active states

## Animations

### Standard Transitions
- Duration: 0.2s
- Easing: ease
- Properties: opacity, transform, background-color

### Common Animations
```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up (for modals) */
@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Layout Patterns

### Paper Lines
Tasks use horizontal lines created with CSS gradients:
```css
background-image: repeating-linear-gradient(
  to bottom,
  transparent,
  transparent calc(var(--paper-line-step) - var(--paper-line-thickness)),
  var(--line-color) calc(var(--paper-line-step) - var(--paper-line-thickness)),
  var(--line-color) var(--paper-line-step)
);
```
- Line step: 36px (height of each task row)
- Line thickness: 1px

### Container Widths
- Max width: 600px for main content areas
- Consistent padding: `var(--spacing-lg)` (1.5rem)

### Spacing Scale
- `--spacing-xs`: 0.25rem
- `--spacing-sm`: 0.5rem
- `--spacing-md`: 1rem
- `--spacing-lg`: 1.5rem
- `--spacing-xl`: 2rem

## Component Patterns

### Modals
- Background: `var(--bg-paper)` with backdrop blur
- Border: `1px solid var(--line-color)`
- No box shadow
- Animation: slideUp

### Buttons
- Icon buttons: 2.5rem × 2.5rem
- Inline buttons: 2rem × 2rem
- Opacity: 0.7 default, 1 on hover
- Transform: scale(1.05) on hover, scale(0.95) on active

### Checkboxes
- Circular (border-radius: 999px)
- 1.25rem × 1.25rem
- Checked state: sage green background with white checkmark (✓)
- Border: 2px solid

### Dropdowns
- Match input field styling
- Serif font for options
- Sage green for selected state with checkmark
- No box shadows

### Input Fields
- Border: `1px solid var(--color-border)`
- Background: `var(--color-bg)`
- Serif font
- No focus glow or blue highlights

## Icons
- Size: 16-20px typically
- Color: Match text color or use secondary
- Opacity: 0.6-0.7 for subtle elements

## Special Elements

### Task Time Labels
- Small bordered pills
- Sans-serif font
- Border changes color based on urgency:
  - Normal: `var(--color-border)`
  - Soon (< 1hr): `var(--ink-amber)`
  - Overdue: `var(--ink-terracotta)`
  - Completed: `var(--ink-sage)`

### Calendar
- Subtle hover states
- Selected day: sage green border
- Task count badges: sage green background

## Dark Mode
- Maintains same design principles
- Inverts paper colors but keeps accent colors similar
- Hover states use white instead of black for overlays

## Key Rules to Remember
1. **Never use blue** for UI elements (except external links if needed)
2. **No shadows** - use borders and subtle backgrounds instead
3. **Serif for content, sans-serif for UI**
4. **Sage green is the primary accent color**
5. **Keep animations subtle and quick (0.2s)**
6. **Focus states should be minimal** - no glowing rings
7. **Paper metaphor** - think flat, lined notebook paper
8. **Consistency over novelty** - reuse patterns