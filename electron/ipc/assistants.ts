import { ipcMain } from "electron";
import { getDb } from "../db/client";
import { assistants } from "../../src/lib/db/schema";
import { eq, desc, not, count } from "drizzle-orm";
import { nanoid } from "nanoid";

export function registerAssistantsIpc() {
  ipcMain.handle("assistants:getAll", async () => {
    const db = getDb();
    return db.select().from(assistants).orderBy(desc(assistants.isDefault));
  });

  ipcMain.handle("assistants:get", async (_e, id: string) => {
    const db = getDb();
    const assistant = await db.select().from(assistants).where(eq(assistants.id, id)).get();
    if (!assistant) {
      throw new Error(`Assistant not found: ${id}`);
    }
    return assistant;
  });

  ipcMain.handle("assistants:create", async (_e, input: {
    name: string;
    systemPrompt: string;
    temperature?: number;
    topP?: number;
    isDefault?: boolean;
    enabled?: boolean;
  }) => {
    const db = getDb();
    const isDefault = input.isDefault ?? false;

    if (isDefault) {
      await db.update(assistants)
        .set({ isDefault: false, updatedAt: new Date().toISOString() })
        .where(eq(assistants.isDefault, true));
    }

    const now = new Date().toISOString();
    return db.insert(assistants).values({
      id: nanoid(),
      name: input.name,
      systemPrompt: input.systemPrompt,
      temperature: input.temperature ?? 0.7,
      topP: input.topP ?? 1.0,
      isDefault,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    }).returning().get();
  });

  ipcMain.handle("assistants:update", async (_e, input: {
    id: string;
    name?: string;
    systemPrompt?: string;
    temperature?: number;
    topP?: number;
    isDefault?: boolean;
    enabled?: boolean;
    image?: string | null;
  }) => {
    const db = getDb();

    const existing = await db.select().from(assistants).where(eq(assistants.id, input.id)).get();
    if (!existing) {
      throw new Error(`Assistant not found: ${input.id}`);
    }

    if (input.isDefault === true && !existing.isDefault) {
      await db.update(assistants)
        .set({ isDefault: false, updatedAt: new Date().toISOString() })
        .where(eq(assistants.isDefault, true));
    }

    const data: Record<string, unknown> = {
      updatedAt: new Date().toISOString()
    };
    if (input.name !== undefined) data.name = input.name;
    if (input.systemPrompt !== undefined) data.systemPrompt = input.systemPrompt;
    if (input.temperature !== undefined) data.temperature = input.temperature;
    if (input.topP !== undefined) data.topP = input.topP;
    if (input.isDefault !== undefined) data.isDefault = input.isDefault;
    if (input.enabled !== undefined) data.enabled = input.enabled;
    if (input.image !== undefined) data.image = input.image;

    return db.update(assistants)
      .set(data)
      .where(eq(assistants.id, input.id))
      .returning()
      .get();
  });

  ipcMain.handle("assistants:delete", async (_e, id: string) => {
    const db = getDb();

    const countResult = await db.select({ value: count() }).from(assistants).get();
    const assistantCount = countResult?.value ?? 0;
    if (assistantCount <= 1) {
      throw new Error("Cannot delete the last assistant");
    }

    const assistant = await db.select().from(assistants).where(eq(assistants.id, id)).get();
    if (!assistant) {
      throw new Error(`Assistant not found: ${id}`);
    }

    if (assistant.isDefault) {
      const nextDefault = await db.select().from(assistants).where(not(eq(assistants.id, id))).get();
      if (nextDefault) {
        await db.update(assistants)
          .set({ isDefault: true, updatedAt: new Date().toISOString() })
          .where(eq(assistants.id, nextDefault.id));
      }
    }

    await db.delete(assistants).where(eq(assistants.id, id));
  });
}
