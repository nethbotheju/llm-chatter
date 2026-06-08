import { ipcMain } from "electron";
import { getPrisma } from "../db/client";

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

    const prisma = getPrisma();
    const messages = await prisma.message.findMany({
      where: { parts: { contains: query } },
      include: {
        conversation: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return messages.map((msg) => ({
      messageId: msg.id,
      snippet: getSnippet(msg.parts, query),
      createdAt: msg.createdAt.toISOString(),
      conversationId: msg.conversation.id,
      conversationTitle: msg.conversation.title || "Untitled",
    }));
  });
}
