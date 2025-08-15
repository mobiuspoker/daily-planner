# Personalized Greeting Implementation Plan

## Overview
Replace the current date in the header with a time-appropriate personalized greeting, and move the date to appear inline with the "TODAY" section header.

## Goals
- Add personalized, time-appropriate greetings to the header
- Move date display to the TODAY section where it's contextually relevant
- Allow users to set their name in Settings
- Maintain clean UI - no greeting if no name is set

## Implementation Steps

### 1. Database & Settings Updates
- Add `userName` field to settings storage
- Default to empty string (no name = no personalized greeting)

### 2. Settings Modal Updates
**File**: `src/components/SettingsModal.tsx`
- Add "Your Name" input field at the top of Settings
- Place it before theme selection (personal settings first)
- Use same styling as other inputs
- Placeholder: "Enter your name (optional)"
- Max length: 50 characters

### 3. Greeting Logic
**New file**: `src/utils/greeting.ts`
```typescript
export function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  
  let timeGreeting: string;
  if (hour < 12) {
    timeGreeting = "Good morning";
  } else if (hour < 17) {
    timeGreeting = "Good afternoon";  
  } else {
    timeGreeting = "Good evening";
  }
  
  if (name && name.trim()) {
    return `${timeGreeting}, ${name}`;
  }
  
  return timeGreeting;
}
```

### 4. App.tsx Header Updates
**Current**:
```tsx
<h1>{currentDate}</h1>
```

**New**:
```tsx
<h1>{greeting}</h1>
```

- Use `getGreeting()` function with userName from settings
- Update every minute (existing interval can handle this)
- If no name is set, show just "Good morning/afternoon/evening"

### 5. UnifiedTaskList Updates
**File**: `src/features/UnifiedTaskList.tsx`

Update TODAY section header from:
```tsx
<h2>TODAY</h2>
```

To:
```tsx
<h2>
  TODAY
  <span className="section-date">
    {DateTime.local().toFormat("EEEE, MMMM d, yyyy")}
  </span>
</h2>
```

Or if space is tight:
```tsx
<h2>
  TODAY • {DateTime.local().toFormat("EEE, MMM d")}
</h2>
```

### 6. Styling
**File**: `src/features/UnifiedTaskList.css`
```css
.section-date {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: normal;
  color: var(--color-text-secondary);
  margin-left: var(--spacing-sm);
  opacity: 0.7;
}
```

Or for inline approach:
```css
.section-header h2 {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-sm);
  font-size: 1rem;
}
```

### 7. State Management
- Add `userName` to `useSettingsStore`
- Load on app init
- Update greeting when name changes

## Edge Cases

### No Name Provided
- Show only time-based greeting: "Good morning"
- No comma, no empty space
- Date still shows next to TODAY

### Very Long Names
- Truncate with ellipsis if > 20 characters in display
- Full name still saved in settings

### Time Zones
- Use local time for greeting calculation
- Already using `DateTime.local()` consistently

### Mobile/Narrow Screens
- Consider shorter date format: "Thu, Dec 14"
- Greeting might wrap to second line on very narrow screens
- Test responsive behavior

## Migration
- Existing users will have empty userName
- No breaking changes - gracefully defaults to non-personalized greeting

## Testing Checklist
- [ ] Settings modal saves and loads name correctly
- [ ] Greeting updates when crossing time boundaries (morning/afternoon/evening)
- [ ] No name = generic greeting only
- [ ] Date displays correctly next to TODAY
- [ ] Dark mode styling works
- [ ] Mobile responsive behavior
- [ ] Name with special characters handled correctly
- [ ] Very long names truncate appropriately

## Future Enhancements (Out of Scope)
- Localization of greetings
- Custom greeting messages
- Different greeting styles (formal/casual)
- Weather or motivational quotes
- Task completion stats in greeting