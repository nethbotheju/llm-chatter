import { ipcMain } from "electron";
import { getDb } from "../db/client";
import { messages, conversations } from "../../src/lib/db/schema";
import { eq, desc, like, inArray } from "drizzle-orm";

function getSnippet(content: string, query: string, length = 150): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerContent.indexOf(lowerQuery);

  if (idx === -1) {
    const end = Math.min(length, content.length);
    let snippet = content.slice(0, end);
    if (content.length > length) snippet += "...";
    return snippet;
  }

  const start = Math.max(0, idx - Math.floor(length / 2));
  const end = Math.min(content.length, idx + query.length + Math.floor(length / 2));
  let snippet = "";
  if (start > 0) snippet += "...";
  snippet += content.slice(start, end);
  if (end < content.length) snippet += "...";
  return snippet;
}

export function registerSearchIpc() {
  ipcMain.handle("search:messages", async (_e, query: string) => {
    if (query.length < 2) return [];

    const db = getDb();
    const matchedMessages = await db.select()
      .from(messages)
      .where(like(messages.parts, `%${query}%`))
      .orderBy(desc(messages.createdAt))
      .limit(50);

    if (matchedMessages.length === 0) return [];

    const conversationIds = [...new Set(matchedMessages.map((m) => m.conversationId))];
    const matchingConversations = await db.select({
      id: conversations.id,
      title: conversations.title,
    })
    .from(conversations)
    .where(inArray(conversations.id, conversationIds));

    const convMap = new Map(matchingConversations.map((c) => [c.id, c]));

    return matchedMessages.map((msg) => {
      const convo = convMap.get(msg.conversationId);
      return {
        messageId: msg.id,
        snippet: getSnippet(msg.parts, query),
        createdAt: typeof msg.createdAt === "string" ? msg.createdAt : new Date(msg.createdAt).toISOString(),
        conversationId: msg.conversationId,
        conversationTitle: convo?.title || "Untitled",
      };
    });
  });
}
