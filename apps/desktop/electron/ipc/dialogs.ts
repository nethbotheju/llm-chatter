import { ipcMain, dialog, BrowserWindow, app } from "electron";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export function registerDialogsIpc() {
  ipcMain.handle(
    "dialogs:saveExport",
    async (
      _event,
      payload: { defaultName: string; json: string },
    ): Promise<{ canceled: boolean; filePath?: string }> => {
      const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
      if (!win) return { canceled: true };

      const result = await dialog.showSaveDialog(win, {
        title: "Export conversations",
        defaultPath: join(app.getPath("downloads"), payload.defaultName),
        filters: [{ name: "JSON", extensions: ["json"] }],
      });

      if (result.canceled || !result.filePath) return { canceled: true };

      writeFileSync(result.filePath, payload.json, "utf8");
      return { canceled: false, filePath: result.filePath };
    },
  );
}
