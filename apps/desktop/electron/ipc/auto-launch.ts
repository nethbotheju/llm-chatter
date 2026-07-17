import { ipcMain } from "electron";
import { setOpenAtLogin, isOpenAtLogin } from "../auto-launch";

export function registerAutoLaunchIpc() {
  ipcMain.handle("autoLaunch:get", () => isOpenAtLogin());
  ipcMain.handle("autoLaunch:set", (_e, enabled: boolean) => {
    setOpenAtLogin(enabled);
    return isOpenAtLogin();
  });
}
