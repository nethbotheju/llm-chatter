import { ipcMain, BrowserWindow } from "electron";
import { showNotification } from "../notifications";

export function registerNotificationsIpc() {
  ipcMain.handle(
    "notifications:show",
    (_event, payload: { title: string; body: string; silent?: boolean }) => {
      const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
      if (!win) return;
      showNotification(win, payload);
    },
  );
}
