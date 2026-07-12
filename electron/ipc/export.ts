import { ipcMain } from "electron";
import { getDb } from "../db/client";
import { conversations, messages, assistants } from "../../src/lib/db/schema";
import { desc, asc } from "drizzle-orm";

export function registerExportIpc() {
  ipcMain.handle("export:data", async () => {
    const db = getDb();

    const convos = await db.select().from(conversations).orderBy(desc(conversations.createdAt));
    const allMessages = await db.select().from(messages).orderBy(asc(messages.createdAt));
    const allAssistants = await db.select().from(assistants);

    const assistantsMap = new Map(allAssistants.map((a) => [a.id, a]));

    return {
      exportedAt: new Date().toISOString(),
      conversations: convos.map((conv) => {
        const assistant = assistantsMap.get(conv.assistantId);
        const convoMessages = allMessages.filter((m) => m.conversationId === conv.id);

        return {
          id: conv.id,
          title: conv.title,
          assistant: assistant?.name || "Unknown",
          createdAt: typeof conv.createdAt === "string" ? conv.createdAt : new Date(conv.createdAt).toISOString(),
          messages: convoMessages.map((msg) => ({
            role: msg.role,
            parts: msg.parts,
            metadata: msg.metadata,
            createdAt: typeof msg.createdAt === "string" ? msg.createdAt : new Date(msg.createdAt).toISOString(),
          })),
        };
      }),
    };
  });
}
