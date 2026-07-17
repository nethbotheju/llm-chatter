import { ipcMain } from "electron";
import { getDb } from "../db/client";
import { conversations, messages, assistants } from "@llm-chatter/db";
import { eq, desc, asc, sql, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export function registerConversationsIpc() {
  ipcMain.handle("conversations:getAll", async () => {
    const db = getDb();
    const allConvos = await db.select({
      id: conversations.id,
      title: conversations.title,
      assistantId: conversations.assistantId,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      messageCount: sql<number>`(select count(*) from ${messages} where ${messages.conversationId} = ${conversations.id})`
    }).from(conversations).orderBy(desc(conversations.updatedAt));

    return allConvos.map(c => ({
      id: c.id,
      title: c.title,
      assistantId: c.assistantId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      _count: {
        messages: Number(c.messageCount)
      }
    }));
  });

  ipcMain.handle("conversations:get", async (_e, id: string) => {
    const db = getDb();
    const conversation = await db.select().from(conversations).where(eq(conversations.id, id)).get();
    if (!conversation) {
      throw new Error(`Conversation not found: ${id}`);
    }

    const convoMessages = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
    const convoAssistant = await db.select().from(assistants).where(eq(assistants.id, conversation.assistantId)).get();

    return {
      ...conversation,
      messages: convoMessages,
      assistant: convoAssistant,
    };
  });

  ipcMain.handle("conversations:create", async (_e, input: {
    assistantId?: string;
    title?: string;
  }) => {
    const db = getDb();

    let assistantId = input.assistantId;
    if (!assistantId) {
      const defaultAssistant = await db.select().from(assistants).where(eq(assistants.isDefault, true)).get();
      if (!defaultAssistant) throw new Error("No assistant available");
      assistantId = defaultAssistant.id;
    }

    const now = new Date().toISOString();
    const createdConvo = await db.insert(conversations).values({
      id: nanoid(),
      title: input.title ?? null,
      assistantId,
      createdAt: now,
      updatedAt: now,
    }).returning().get();

    const convoAssistant = await db.select().from(assistants).where(eq(assistants.id, assistantId)).get();

    return {
      ...createdConvo,
      messages: [],
      assistant: convoAssistant,
    };
  });

  ipcMain.handle("conversations:update", async (_e, input: {
    id: string;
    title?: string;
  }) => {
    const db = getDb();
    const now = new Date().toISOString();

    if (input.title !== undefined) {
      await db.update(conversations)
        .set({ title: input.title, updatedAt: now })
        .where(eq(conversations.id, input.id));
    }

    const conversation = await db.select().from(conversations).where(eq(conversations.id, input.id)).get();
    if (!conversation) {
      throw new Error(`Conversation not found: ${input.id}`);
    }

    const convoMessages = await db.select().from(messages).where(eq(messages.conversationId, input.id)).orderBy(asc(messages.createdAt));
    const convoAssistant = await db.select().from(assistants).where(eq(assistants.id, conversation.assistantId)).get();

    return {
      ...conversation,
      messages: convoMessages,
      assistant: convoAssistant,
    };
  });

  ipcMain.handle("conversations:delete", async (_e, id: string) => {
    const db = getDb();
    await db.delete(conversations).where(eq(conversations.id, id));
  });

  ipcMain.handle("conversations:deleteAll", async () => {
    const db = getDb();
    await db.delete(messages);
    await db.delete(conversations);
  });

  ipcMain.handle("messages:get", async (_e, conversationId: string) => {
    const db = getDb();
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(asc(messages.createdAt));
  });

  ipcMain.handle("messages:create", async (_e, input: {
    conversationId: string;
    role: string;
    parts: string;
    metadata?: string | null;
  }) => {
    const db = getDb();
    const now = new Date().toISOString();

    const message = await db.insert(messages).values({
      id: nanoid(),
      conversationId: input.conversationId,
      role: input.role,
      parts: input.parts,
      metadata: input.metadata || null,
      createdAt: now,
    }).returning().get();

    await db.update(conversations)
      .set({ updatedAt: now })
      .where(eq(conversations.id, input.conversationId));

    return message;
  });

  ipcMain.handle("messages:update", async (_e, input: {
    messageId: string;
    conversationId: string;
    parts: string;
  }) => {
    const db = getDb();
    await db.update(messages)
      .set({ parts: input.parts })
      .where(and(eq(messages.id, input.messageId), eq(messages.conversationId, input.conversationId)));
  });

  ipcMain.handle("messages:delete", async (_e, input: {
    messageId: string;
    conversationId: string;
  }) => {
    const db = getDb();
    await db.delete(messages)
      .where(and(eq(messages.id, input.messageId), eq(messages.conversationId, input.conversationId)));
  });
}
