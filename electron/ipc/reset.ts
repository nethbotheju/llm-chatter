import { ipcMain } from "electron";
import { getPrisma } from "../db/client";
import { seedDatabase } from "../db/seed";

export function registerResetIpc() {
  ipcMain.handle("reset:data", async () => {
    const prisma = getPrisma();
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.model.deleteMany();
    await prisma.assistant.deleteMany();
    await prisma.provider.deleteMany();
    await seedDatabase();
  });
}
