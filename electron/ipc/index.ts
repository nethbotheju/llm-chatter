import { ipcMain, BrowserWindow, type IpcMainInvokeEvent } from "electron";
import { serializeDates } from "./serialize";

const origHandle = ipcMain.handle.bind(ipcMain);

// Wrap ipcMain.handle to auto-serialize Date objects to ISO strings.
// Prisma returns Date instances, but the renderer's Zod schemas expect strings.
ipcMain.handle = (channel: string, handler: (e: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>) => {
  origHandle(channel, async (e: IpcMainInvokeEvent, ...args: unknown[]) => {
    const result = await handler(e, ...args);
    return serializeDates(result);
  });
};
import { registerProvidersIpc } from "./providers";
import { registerModelsIpc } from "./models";
import { registerAssistantsIpc } from "./assistants";
import { registerConversationsIpc } from "./conversations";
import { registerSearchIpc } from "./search";
import { registerExportIpc } from "./export";
import { registerStatsIpc } from "./stats";
import { registerResetIpc } from "./reset";
import { registerChatIpc } from "./chat";
import { registerDialogsIpc } from "./dialogs";
import { registerNotificationsIpc } from "./notifications";
import { registerAutoLaunchIpc } from "./auto-launch";

export function registerAllIpc() {
  registerProvidersIpc();
  registerModelsIpc();
  registerAssistantsIpc();
  registerConversationsIpc();
  registerSearchIpc();
  registerExportIpc();
  registerStatsIpc();
  registerResetIpc();
  registerChatIpc(() => BrowserWindow.getAllWindows()[0] ?? null);
  registerDialogsIpc();
  registerNotificationsIpc();
  registerAutoLaunchIpc();
}
