# System Tray Implementation Plan

## Overview
Currently, the Daily Planner app completely exits when closed, which prevents background features like midnight clear from working. This plan outlines implementing proper system tray functionality so the app minimizes to tray instead of exiting.

## Current State
- ✅ Tray icon is configured in `tauri.conf.json`
- ✅ Tray service exists at `src/services/tray.ts` with menu and minimize-to-tray logic
- ❌ Tray service is never initialized (not called in App.tsx)
- ❌ Close button actually exits the app instead of minimizing to tray
- ❌ No user preference for tray behavior

## Implementation Tasks

### Phase 1: Basic Tray Functionality
1. **Initialize tray service on app startup**
   - Import and call `setupTrayMenu()` in App.tsx initialization
   - Add to the services initialization block (Stage 4)
   - Handle initialization errors gracefully

2. **Fix window close behavior**
   - Ensure close button minimizes to tray instead of exiting
   - Already implemented in `tray.ts:73-76` but needs activation

3. **Test basic functionality**
   - Verify app minimizes to tray on close
   - Verify tray menu shows/hides window
   - Verify "Exit" menu item properly closes app

### Phase 2: User Preferences
1. **Add settings for tray behavior**
   - Add new setting: `minimizeToTray` (boolean, default: true)
   - Add new setting: `showTrayIcon` (boolean, default: true)
   - Update SettingsModal to include tray options

2. **Implement conditional behavior**
   - If `minimizeToTray` is false, close button should exit app
   - If `showTrayIcon` is false, hide tray icon (but warn about midnight clear)
   - Save preferences to database

3. **Add UI indicators**
   - Show tooltip on close button: "Minimizes to system tray"
   - Add info text in settings about tray benefits (midnight clear, etc.)

### Phase 3: Enhanced Tray Features
1. **Improve tray menu**
   - Add "Quick Add Task" menu item (triggers global hotkey modal)
   - Add "Run Midnight Clear Now" for manual trigger
   - Show task count badge on tray icon (Windows 10+)
   - Add checkmark indicator for "Start on Login" status

2. **Double-click behavior**
   - Implement double-click on tray icon to show/hide window
   - Currently commented out in `tray.ts:62-69`, needs investigation

3. **Notification area integration**
   - Show balloon tips for important events
   - "Daily Planner is running in background"
   - "X tasks completed today"

### Phase 4: Platform-Specific Improvements
1. **Windows-specific**
   - Ensure app starts minimized when launched at login
   - Handle Windows 11 tray overflow area properly
   - Test with different DPI settings

2. **macOS-specific**
   - Use native menu bar integration
   - Follow macOS HIG for menu bar apps
   - Consider dock icon visibility preferences

3. **Linux-specific**
   - Test with different desktop environments
   - Handle systems without system tray support

## Technical Considerations

### Memory Management
- Monitor memory usage when minimized
- Implement cleanup for hidden window state
- Consider reducing update frequency when minimized

### Auto-Start Integration
- Ensure "Start on Login" works with tray mode
- App should start minimized to tray when auto-started
- Check if `--minimized` flag is passed (already in autostart config)

### Error Handling
- What if tray creation fails?
- Fallback behavior if system tray not available
- Handle tray icon missing/corrupted

## Testing Checklist
- [ ] App minimizes to tray on close
- [ ] Tray menu all items work
- [ ] Window restore from tray works
- [ ] Exit from tray menu works
- [ ] Settings for tray behavior work
- [ ] Midnight clear works when minimized
- [ ] Notifications work when minimized
- [ ] Auto-start launches to tray
- [ ] Memory usage acceptable when minimized
- [ ] Works on Windows 10/11
- [ ] Works on macOS (if applicable)
- [ ] Works on Linux (if applicable)

## User Communication
1. **First-time users**
   - Show one-time tooltip: "Daily Planner is still running in your system tray"
   - Add help text in About modal

2. **Settings description**
   - "Minimize to system tray when closed (keeps midnight clear active)"
   - "Show system tray icon"

3. **Migration for existing users**
   - Default to tray enabled for better experience
   - Show notification about new tray feature after update

## Implementation Order
1. Phase 1 - Basic functionality (critical)
2. Phase 2 - User preferences (important)
3. Phase 3 - Enhanced features (nice to have)
4. Phase 4 - Platform optimization (polish)

## Estimated Effort
- Phase 1: 30 minutes
- Phase 2: 1 hour
- Phase 3: 2 hours
- Phase 4: 2 hours

Total: ~5.5 hours for full implementation

## Success Criteria
- Users who close the app have midnight clear continue working
- Users can easily access the app from system tray
- Users can choose whether to use tray or not
- No increase in memory usage over time when minimized
- No confused users wondering where the app went