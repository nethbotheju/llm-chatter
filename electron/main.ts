import { app, BrowserWindow, shell } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runMigrations } from "./db/migrations";
import { registerAllIpc } from "./ipc";
import { registerShortcuts, unregisterShortcuts } from "./shortcuts";
import { createTray, destroyTray } from "./tray";
import { setApplicationMenu } from "./menu";

const __dirname = dirname(fileURLToPath(import.meta.url));

const RENDERER_URL = process.env.ELECTRON_RENDERER_URL;
const isDev = !!RENDERER_URL;

let mainWindow: BrowserWindow | null = null;

function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: "#0e0e0e",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  if (isDev && RENDERER_URL) {
    void win.loadURL(RENDERER_URL);
  } else {
    void win.loadFile(join(__dirname, "../out/index.html"));
  }

  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });

  mainWindow = win;
  return win;
}

app.whenReady().then(async () => {
  try {
    await runMigrations();
    registerAllIpc();
  } catch (err) {
    console.error("Migration/IPC setup failed:", err);
  }

  setApplicationMenu(getMainWindow);
  createTray(getMainWindow);
  registerShortcuts(getMainWindow);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  unregisterShortcuts();
  destroyTray();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
