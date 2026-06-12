import { ipcMain } from "electron";
import { getPrisma } from "../db/client";
import { nanoid } from "nanoid";

export function registerConversationsIpc() {
  ipcMain.handle("conversations:getAll", async () => {
    const prisma = getPrisma();
    return prisma.conversation.findMany({
      include: { _count: { select: { messages: true } } },
      orderBy: { updatedAt: "desc" },
    });
  });

  ipcMain.handle("conversations:get", async (_e, id: string) => {
    const prisma = getPrisma();
    return prisma.conversation.findUniqueOrThrow({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        assistant: true,
      },
    });
  });

  ipcMain.handle("conversations:create", async (_e, input: {
    assistantId?: string;
    title?: string;
  }) => {
    const prisma = getPrisma();

    let assistantId = input.assistantId;
    if (!assistantId) {
      const defaultAssistant = await prisma.assistant.findFirst({
        where: { isDefault: true },
      });
      if (!defaultAssistant) throw new Error("No assistant available");
      assistantId = defaultAssistant.id;
    }

    const conversation = await prisma.conversation.create({
      data: {
        id: nanoid(),
        title: input.title ?? null,
        assistantId,
      },
      include: {
        messages: true,
        assistant: true,
      },
    });

    return conversation;
  });

  ipcMain.handle("conversations:update", async (_e, input: {
    id: string;
    title?: string;
  }) => {
    const prisma = getPrisma();

    if (input.title !== undefined) {
      await prisma.conversation.update({
        where: { id: input.id },
        data: { title: input.title },
      });
    }

    return prisma.conversation.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        assistant: true,
      },
    });
  });

  ipcMain.handle("conversations:delete", async (_e, id: string) => {
    const prisma = getPrisma();
    await prisma.conversation.delete({ where: { id } });
  });

  ipcMain.handle("conversations:deleteAll", async () => {
    const prisma = getPrisma();
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
  });

  ipcMain.handle("messages:get", async (_e, conversationId: string) => {
    const prisma = getPrisma();
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
  });

  ipcMain.handle("messages:create", async (_e, input: {
    conversationId: string;
    role: string;
    parts: string;
    metadata?: string | null;
  }) => {
    const prisma = getPrisma();
    const message = await prisma.message.create({
      data: {
        id: nanoid(),
        conversationId: input.conversationId,
        role: input.role,
        parts: input.parts,
        metadata: input.metadata || null,
      },
    });

    await prisma.conversation.update({
      where: { id: input.conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  });

  ipcMain.handle("messages:update", async (_e, input: {
    messageId: string;
    conversationId: string;
    parts: string;
  }) => {
    const prisma = getPrisma();
    await prisma.message.update({
      where: {
        id: input.messageId,
        conversationId: input.conversationId,
      },
      data: { parts: input.parts },
    });
  });

  ipcMain.handle("messages:delete", async (_e, input: {
    messageId: string;
    conversationId: string;
  }) => {
    const prisma = getPrisma();
    await prisma.message.delete({
      where: {
        id: input.messageId,
        conversationId: input.conversationId,
      },
    });
  });
}
