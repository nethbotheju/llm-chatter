import { ipcMain } from "electron";
import {
  checkForUpdatesNow,
  installUpdateNow,
  getUpdaterStatus,
} from "../updater";

export function registerUpdaterIpc() {
  ipcMain.handle("updater:getStatus", () => getUpdaterStatus());
  ipcMain.handle("updater:check", () => {
    checkForUpdatesNow();
  });
  ipcMain.handle("updater:install", () => {
    installUpdateNow();
  });
}
