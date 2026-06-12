import { ipcMain } from "electron";
import { getPrisma } from "../db/client";

export function registerExportIpc() {
  ipcMain.handle("export:data", async () => {
    const prisma = getPrisma();

    const conversations = await prisma.conversation.findMany({
      include: {
        assistant: { select: { name: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            role: true,
            parts: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      exportedAt: new Date().toISOString(),
      conversations: conversations.map((conv) => ({
        id: conv.id,
        title: conv.title,
        assistant: conv.assistant.name,
        createdAt: conv.createdAt.toISOString(),
        messages: conv.messages.map((msg) => ({
          role: msg.role,
          parts: msg.parts,
          metadata: msg.metadata,
          createdAt: msg.createdAt.toISOString(),
        })),
      })),
    };
  });
}
