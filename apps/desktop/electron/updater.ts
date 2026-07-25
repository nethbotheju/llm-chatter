import { autoUpdater, type UpdateInfo } from "electron-updater";
import { BrowserWindow } from "electron";
import type { UpdaterStatus } from "@llm-chatter/contracts";

type StickyStatus = Extract<
  UpdaterStatus,
  { state: "idle" | "available" | "downloading" | "downloaded" }
>;

const isDev = !!process.env.ELECTRON_RENDERER_URL;
const STATUS_CHANNEL = "updater:status";

let current: StickyStatus = { state: "idle" };
let pendingVersion: string | null = null;
let started = false;
let isChecking = false;

function emit(status: UpdaterStatus) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(STATUS_CHANNEL, status);
  }
}

function setSticky(status: StickyStatus) {
  current = status;
  emit(status);
}

export function getUpdaterStatus(): UpdaterStatus {
  return current;
}

export function checkForUpdatesNow() {
  if (isDev) {
    emit({ state: "unsupported" });
    return;
  }
  if (isChecking) return;
  isChecking = true;
  emit({ state: "checking" });
  autoUpdater.checkForUpdates().catch((err: unknown) => {
    isChecking = false;
    emit({
      state: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  });
}

export function installUpdateNow() {
  if (current.state !== "downloaded") return;
  autoUpdater.quitAndInstall();
}

export function setupAutoUpdater() {
  if (started) return;
  started = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.disableWebInstaller = true;

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    pendingVersion = info.version;
    isChecking = false;
    setSticky({ state: "available", version: info.version });
  });

  autoUpdater.on("update-not-available", () => {
    isChecking = false;
    pendingVersion = null;
    emit({ state: "not-available" });
    current = { state: "idle" };
  });

  autoUpdater.on("download-progress", (progress) => {
    setSticky({
      state: "downloading",
      version: pendingVersion ?? "",
      percent: Math.round(progress.percent),
    });
  });

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    isChecking = false;
    pendingVersion = info.version;
    setSticky({ state: "downloaded", version: info.version });
  });

  autoUpdater.on("error", (err: Error) => {
    isChecking = false;
    console.error(`[updater] ${err.message}`);
    emit({ state: "error", message: err.message });
    current = { state: "idle" };
  });

  if (!isDev) {
    setTimeout(() => {
      checkForUpdatesNow();
    }, 5000);
  }
}
