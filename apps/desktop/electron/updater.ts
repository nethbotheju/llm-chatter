import { autoUpdater, type UpdateInfo } from "electron-updater";
import { BrowserWindow, dialog } from "electron";

export function setupAutoUpdater(getWindow: () => BrowserWindow | null) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.disableWebInstaller = true;

  autoUpdater.on("checking-for-update", () => {
    console.log("[updater] Checking for update…");
  });

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    console.log(`[updater] Update available: ${info.version}`);
  });

  autoUpdater.on("update-not-available", () => {
    console.log("[updater] No update available.");
  });

  autoUpdater.on("download-progress", (progress) => {
    console.log(`[updater] Downloading: ${progress.percent.toFixed(1)}%`);
  });

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    console.log(`[updater] Update downloaded: ${info.version}`);
    const win = getWindow();
    if (!win) return;

    dialog
      .showMessageBox(win, {
        type: "info",
        title: "Update ready",
        message: `Version ${info.version} has been downloaded. Restart to apply the update?`,
        buttons: ["Restart", "Later"],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  autoUpdater.on("error", (err: Error) => {
    console.error(`[updater] Error: ${err.message}`);
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error(`[updater] Update check failed: ${err}`);
    });
  }, 5000);
}
