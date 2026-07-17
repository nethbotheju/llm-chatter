import { globalShortcut, app, BrowserWindow } from "electron";

export function registerShortcuts(getWindow: () => BrowserWindow | null) {
  globalShortcut.register("CommandOrControl+Shift+N", () => {
    const win = getWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
      win.webContents.send("shortcut:new-chat");
    }
  });

  app.on("browser-window-focus", () => {
    // In-window shortcuts (Cmd+B, Cmd+,, Cmd+N, Cmd+F) are handled
    // by the renderer's useKeyboardShortcuts hook when focused.
  });
}

export function unregisterShortcuts() {
  globalShortcut.unregisterAll();
}
