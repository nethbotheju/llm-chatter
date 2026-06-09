import { app } from "electron";

export function setOpenAtLogin(enabled: boolean) {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: false,
  });
}

export function isOpenAtLogin(): boolean {
  return app.getLoginItemSettings().openAtLogin;
}
