import { TrayIcon } from "@tauri-apps/api/tray";
import { Menu } from "@tauri-apps/api/menu";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";

let tray: TrayIcon | null = null;

export async function setupTrayMenu() {
  try {
    // Get the tray icon that was created in Rust
    tray = await TrayIcon.getById("main");
    
    if (!tray) {
      console.error("Tray icon not found");
      return;
    }
    
    // Create menu
    const menu = await Menu.new({
      items: [
        {
          text: "Show/Hide",
          action: async () => {
            const window = getCurrentWindow();
            const isVisible = await window.isVisible();
            if (isVisible) {
              await window.hide();
            } else {
              await window.show();
              await window.setFocus();
            }
          },
        },
        {
          text: "Start on Login",
          action: async () => {
            const enabled = await isEnabled();
            if (enabled) {
              await disable();
            } else {
              await enable();
            }
          },
        },
        {
          text: "separator",
        },
        {
          text: "Exit",
          action: async () => {
            const { exit } = await import("@tauri-apps/plugin-process");
            await exit(0);
          },
        },
      ],
    });
    
    await tray.setMenu(menu);
    
    // Handle tray click
    tray.onClick(async () => {
      const window = getCurrentWindow();
      const isVisible = await window.isVisible();
      if (!isVisible) {
        await window.show();
        await window.setFocus();
      }
    });
    
    // Handle window close to minimize to tray
    const window = getCurrentWindow();
    await window.onCloseRequested(async (event) => {
      event.preventDefault();
      await window.hide();
    });
    
  } catch (error) {
    console.error("Failed to setup tray menu:", error);
  }
}