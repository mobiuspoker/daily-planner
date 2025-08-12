import { register, unregister, isRegistered } from "@tauri-apps/plugin-global-shortcut";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getSetting } from './settingsService';

// Store callbacks globally to persist across re-renders
const globalCallbacks = new Map<string, () => void>();
let isSetup = false;
let currentHotkey: string | null = null;

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
    // Get the configured hotkey or use default
    const hotkey = (await getSetting('globalHotkey') || 'Ctrl+Shift+A') as string;
    
    // If we already have this exact hotkey registered, just update the callback and return
    if (currentHotkey === hotkey && await isRegistered(hotkey)) {
      console.log(`Hotkey ${hotkey} already registered, skipping re-registration`);
      isSetup = true;
      return;
    }
    
    // Always try to unregister any existing hotkey first
    if (currentHotkey) {
      try {
        const alreadyRegistered = await isRegistered(currentHotkey);
        if (alreadyRegistered) {
          await unregister(currentHotkey);
          console.log(`Unregistered existing hotkey: ${currentHotkey}`);
        }
      } catch (e) {
        // Ignore unregister errors
      }
    }
    
    // Also try to unregister the target hotkey if it's somehow already registered
    try {
      if (await isRegistered(hotkey)) {
        await unregister(hotkey);
        console.log(`Cleaned up stale registration of ${hotkey}`);
      }
    } catch (e) {
      // Ignore errors
    }
    
    // Register the new hotkey
    await register(hotkey, handleHotkey);
    currentHotkey = hotkey;
    
    isSetup = true;
    console.log(`Global hotkey ${hotkey} registered successfully`);
  } catch (error) {
    // Only log as error if it's not an "already registered" error
    const errorMessage = error instanceof Error ? error.toString() : String(error);
    if (!errorMessage.includes('already registered')) {
      console.error("Failed to register global hotkey:", error);
    }
    isSetup = false;
  }
}

export async function updateGlobalHotkey(newHotkey: string) {
  try {
    // If it's the same hotkey, no need to do anything
    if (currentHotkey === newHotkey) {
      console.log(`Hotkey unchanged: ${newHotkey}`);
      return;
    }
    
    // Unregister the current hotkey
    if (currentHotkey) {
      try {
        const isReg = await isRegistered(currentHotkey);
        if (isReg) {
          await unregister(currentHotkey);
          console.log(`Unregistered hotkey: ${currentHotkey}`);
        }
      } catch (e) {
        // Ignore unregister errors
      }
    }
    
    // Try to clean up if the new hotkey is somehow already registered
    try {
      if (await isRegistered(newHotkey)) {
        await unregister(newHotkey);
        console.log(`Cleaned up existing registration of ${newHotkey}`);
      }
    } catch (e) {
      // Ignore errors
    }
    
    // Register the new hotkey
    await register(newHotkey, handleHotkey);
    currentHotkey = newHotkey;
    
    console.log(`Updated global hotkey to: ${newHotkey}`);
  } catch (error) {
    // Only log as error if it's not an "already registered" error
    const errorMessage = error instanceof Error ? error.toString() : String(error);
    if (!errorMessage.includes('already registered')) {
      console.error("Failed to update global hotkey:", error);
    }
    
    // Try to re-register the old hotkey if update failed
    if (currentHotkey && currentHotkey !== newHotkey) {
      try {
        await register(currentHotkey, handleHotkey);
        console.log(`Reverted to previous hotkey: ${currentHotkey}`);
      } catch (e) {
        console.error("Failed to revert hotkey:", e);
      }
    }
    
    throw error;
  }
}

export async function cleanupGlobalHotkey() {
  if (!isSetup || !currentHotkey) return;
  
  try {
    const isReg = await isRegistered(currentHotkey);
    if (isReg) {
      await unregister(currentHotkey);
      console.log(`Global hotkey ${currentHotkey} unregistered`);
    }
    isSetup = false;
    currentHotkey = null;
  } catch (error) {
    // Ignore errors during cleanup
    console.log("Cleanup: hotkey might already be unregistered");
  }
}