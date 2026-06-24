import { app, BrowserWindow, shell } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createServer } from "http";
import { statSync, createReadStream } from "node:fs";
import { extname } from "node:path";
import { runMigrations } from "./db/migrations";
import { registerAllIpc } from "./ipc";
import { registerShortcuts, unregisterShortcuts } from "./shortcuts";
import { createTray, destroyTray } from "./tray";
import { setApplicationMenu } from "./menu";
import { setupAutoUpdater } from "./updater";

const __dirname = dirname(fileURLToPath(import.meta.url));

const RENDERER_URL = process.env.ELECTRON_RENDERER_URL;
const isDev = !!RENDERER_URL;

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
};

let serverUrl: string | null = null;

function startStaticServer(): Promise<string> {
  const outDir = join(__dirname, "../../out");
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      // Strip query string — req.url includes ?_rsc=... from Next.js router
      const urlPath = req.url!.split("?")[0];
      let filePath = join(outDir, urlPath === "/" ? "/index.html" : urlPath);

      try {
        const stats = statSync(filePath);
        if (stats.isDirectory()) {
          // For SPA routes like /settings/general that are directories,
          // serve the .html file first, then fall back to index.html
          const htmlPath = join(outDir, urlPath + ".html");
          try {
            statSync(htmlPath);
            filePath = htmlPath;
          } catch {
            filePath = join(outDir, "index.html");
          }
        }
      } catch {
        // File not found — try .html extension for SPA routes, then fall back
        const htmlPath = join(outDir, urlPath + ".html");
        try {
          statSync(htmlPath);
          filePath = htmlPath;
        } catch {
          filePath = join(outDir, "index.html");
        }
      }

      const ext = extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      try {
        const stream = createReadStream(filePath);
        res.writeHead(200, { "Content-Type": contentType });
        stream.pipe(res);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (typeof addr === "object" && addr) {
        const url = `http://127.0.0.1:${addr.port}`;
        resolve(url);
      } else {
        reject(new Error("Failed to start static server"));
      }
    });

    app.on("before-quit", () => server.close());
  });
}

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
      preload: join(__dirname, "../preload/index.js"),
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
  } else if (serverUrl) {
    void win.loadURL(serverUrl);
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

  if (!isDev) {
    serverUrl = await startStaticServer();
  }

  setApplicationMenu(getMainWindow);
  createTray(getMainWindow);
  registerShortcuts(getMainWindow);
  createWindow();

  if (!isDev) {
    setupAutoUpdater(getMainWindow);
  }

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