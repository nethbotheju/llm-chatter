import { autoUpdater, type UpdateInfo } from "electron-updater";
import { BrowserWindow } from "electron";
import type { UpdaterStatus } from "@llm-chatter/contracts";

const isDev = !!process.env.ELECTRON_RENDERER_URL;
const STATUS_CHANNEL = "updater:status";

let current: UpdaterStatus = { state: "idle" };
let pendingVersion: string | null = null;
let started = false;

function broadcast(status: UpdaterStatus) {
  current = status;
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(STATUS_CHANNEL, status);
  }
}

export function getUpdaterStatus(): UpdaterStatus {
  return current;
}

export function checkForUpdatesNow() {
  if (isDev) {
    broadcast({
      state: "error",
      message: "Updates are not available in development builds.",
    });
    return;
  }
  autoUpdater.checkForUpdates().catch((err: unknown) => {
    broadcast({
      state: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  });
}

export function installUpdateNow() {
  autoUpdater.quitAndInstall();
}

export function setupAutoUpdater() {
  if (started) return;
  started = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.disableWebInstaller = true;

  autoUpdater.on("checking-for-update", () => {
    broadcast({ state: "checking" });
  });

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    pendingVersion = info.version;
    broadcast({ state: "available", version: info.version });
  });

  autoUpdater.on("update-not-available", () => {
    pendingVersion = null;
    broadcast({ state: "not-available" });
  });

  autoUpdater.on("download-progress", (progress) => {
    broadcast({
      state: "downloading",
      version: pendingVersion ?? "",
      percent: Math.round(progress.percent),
    });
  });

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    pendingVersion = info.version;
    broadcast({ state: "downloaded", version: info.version });
  });

  autoUpdater.on("error", (err: Error) => {
    broadcast({ state: "error", message: err.message });
  });

  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error(`[updater] Auto check failed: ${err}`);
      });
    }, 5000);
  }
}
