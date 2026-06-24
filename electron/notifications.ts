import { Notification, BrowserWindow } from "electron";

export function showNotification(
  win: BrowserWindow,
  payload: { title: string; body: string; silent?: boolean },
) {
  if (!Notification.isSupported()) return;
  if (win.isFocused()) return;

  const n = new Notification({
    title: payload.title,
    body: payload.body,
    silent: payload.silent ?? false,
  });

  n.on("click", () => {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });

  n.show();
}
