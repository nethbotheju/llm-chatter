import { app, BrowserWindow, shell } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runMigrations } from "./db/migrations";
import { registerAllIpc } from "./ipc";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Dev: point at the running Next.js dev server.
// Prod: point at the static export in `out/`.
const RENDERER_URL = process.env.ELECTRON_RENDERER_URL;
const isDev = !!RENDERER_URL;

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
      sandbox: true,
      webSecurity: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  // Open external links in the system browser, never inside our window
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

  return win;
}

app.whenReady().then(async () => {
  await runMigrations();
  registerAllIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
