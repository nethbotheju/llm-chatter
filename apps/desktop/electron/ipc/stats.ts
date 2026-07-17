import { ipcMain } from "electron";
import { getDb } from "../db/client";
import { conversations, messages } from "@llm-chatter/db";
import { count } from "drizzle-orm";

export function registerStatsIpc() {
  ipcMain.handle("stats:get", async () => {
    const db = getDb();
    const [conversationsResult, messagesResult] = await Promise.all([
      db.select({ value: count() }).from(conversations).get(),
      db.select({ value: count() }).from(messages).get(),
    ]);
    return {
      conversations: conversationsResult?.value ?? 0,
      messages: messagesResult?.value ?? 0,
    };
  });
}
