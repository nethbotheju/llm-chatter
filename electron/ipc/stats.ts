import { ipcMain } from "electron";
import { getPrisma } from "../db/client";

export function registerStatsIpc() {
  ipcMain.handle("stats:get", async () => {
    const prisma = getPrisma();
    const [conversations, messages] = await Promise.all([
      prisma.conversation.count(),
      prisma.message.count(),
    ]);
    return { conversations, messages };
  });
}
