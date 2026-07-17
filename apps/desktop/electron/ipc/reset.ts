import { ipcMain } from "electron";
import { getDb } from "../db/client";
import { messages, conversations, models, assistants, providers } from "@llm-chatter/db";
import { seedDatabase } from "../db/seed";

export function registerResetIpc() {
  ipcMain.handle("reset:data", async () => {
    const db = getDb();
    await db.delete(messages);
    await db.delete(conversations);
    await db.delete(models);
    await db.delete(assistants);
    await db.delete(providers);
    await seedDatabase();
  });
}
