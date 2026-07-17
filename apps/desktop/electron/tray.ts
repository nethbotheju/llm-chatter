import { Tray, Menu, app, BrowserWindow, nativeImage } from "electron";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let tray: Tray | null = null;

export function createTray(getWindow: () => BrowserWindow | null) {
  const iconPath = join(__dirname, "../build/tray-icon.png");
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show llm Chatter",
      click: () => {
        const win = getWindow();
        if (win) {
          win.show();
          win.focus();
        }
      },
    },
    {
      label: "New Chat",
      accelerator: "CommandOrControl+Shift+N",
      click: () => {
        const win = getWindow();
        if (win) {
          if (!win.isVisible()) win.show();
          win.focus();
          win.webContents.send("shortcut:new-chat");
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip("llm Chatter");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    const win = getWindow();
    if (win) {
      win.isVisible() ? win.focus() : win.show();
    }
  });

  return tray;
}

export function destroyTray() {
  tray?.destroy();
  tray = null;
}
