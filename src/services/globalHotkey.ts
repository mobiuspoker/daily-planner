import { register, unregister, isRegistered } from "@tauri-apps/plugin-global-shortcut";
import { getCurrentWindow } from "@tauri-apps/api/window";

// Store callbacks globally to persist across re-renders
const globalCallbacks = new Map<string, () => void>();
let isSetup = false;
const HOTKEY = "Ctrl+Shift+A";

// Single global handler that won't be recreated
async function handleHotkey() {
  console.log("Global hotkey triggered");
  
  try {
    // Show and focus the window
    const window = getCurrentWindow();
    
    // First unminimize if minimized
    const isMinimized = await window.isMinimized();
    if (isMinimized) {
      await window.unminimize();
    }
    
    // Then show if hidden
    const isVisible = await window.isVisible();
    if (!isVisible) {
      await window.show();
    }
    
    // Finally focus the window
    await window.setFocus();
    
    // Trigger the quick add callback
    const callback = globalCallbacks.get('quickAdd');
    if (callback) {
      // Small delay to ensure window is focused
      setTimeout(() => {
        callback();
      }, 100);
    }
  } catch (error) {
    console.error("Error handling hotkey:", error);
  }
}

export async function setupGlobalHotkey(onQuickAdd: () => void) {
  // Update the callback
  globalCallbacks.set('quickAdd', onQuickAdd);
  
  try {
    // Always try to unregister first to clean up any stale handlers
    try {
      const alreadyRegistered = await isRegistered(HOTKEY);
      if (alreadyRegistered) {
        await unregister(HOTKEY);
        console.log("Unregistered existing hotkey");
      }
    } catch (e) {
      // Ignore unregister errors
    }
    
    // Register the global hotkey with the stable handler
    await register(HOTKEY, handleHotkey);
    
    isSetup = true;
    console.log(`Global hotkey ${HOTKEY} registered successfully`);
  } catch (error) {
    console.error("Failed to register global hotkey:", error);
    isSetup = false;
  }
}

export async function cleanupGlobalHotkey() {
  if (!isSetup) return;
  
  try {
    const isReg = await isRegistered(HOTKEY);
    if (isReg) {
      await unregister(HOTKEY);
      console.log("Global hotkey unregistered");
    }
    isSetup = false;
  } catch (error) {
    // Ignore errors during cleanup
    console.log("Cleanup: hotkey might already be unregistered");
  }
}