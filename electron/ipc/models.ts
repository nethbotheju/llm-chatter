import { ipcMain } from "electron";
import { getDb } from "../db/client";
import { models, providers } from "../../src/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

export function registerModelsIpc() {
  ipcMain.handle("models:getAll", async (_e, args?: {
    providerId?: string;
    includeDisabled?: boolean;
  }) => {
    const db = getDb();
    const conditions = [];

    if (args?.providerId) {
      conditions.push(eq(models.providerId, args.providerId));
    }

    if (!args?.includeDisabled) {
      conditions.push(eq(models.enabled, true));
      conditions.push(eq(providers.enabled, true));
    }

    let query = db.select({
      id: models.id,
      name: models.name,
      providerId: models.providerId,
      capabilities: models.capabilities,
      catalogModelId: models.catalogModelId,
      metadata: models.metadata,
      enabled: models.enabled,
      createdAt: models.createdAt,
      updatedAt: models.updatedAt,
      provider: {
        id: providers.id,
        name: providers.name,
        type: providers.type,
        enabled: providers.enabled,
      }
    })
    .from(models)
    .innerJoin(providers, eq(models.providerId, providers.id));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    query.orderBy(asc(providers.name), asc(models.name));

    return await query;
  });

  ipcMain.handle("models:create", async (_e, input: {
    name: string;
    providerId: string;
    capabilities?: string[];
    metadata?: string | null;
    enabled?: boolean;
  }) => {
    const db = getDb();
    const now = new Date().toISOString();
    const createdModel = await db.insert(models).values({
      id: nanoid(),
      name: input.name,
      providerId: input.providerId,
      capabilities: JSON.stringify(input.capabilities || ["chat"]),
      metadata: input.metadata ?? null,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    }).returning().get();

    const providerObj = await db.select({
      id: providers.id,
      name: providers.name,
      type: providers.type,
      enabled: providers.enabled,
    }).from(providers).where(eq(providers.id, input.providerId)).get();

    return {
      ...createdModel,
      provider: providerObj,
    };
  });

  ipcMain.handle("models:update", async (_e, input: {
    id: string;
    name?: string;
    capabilities?: string[];
    metadata?: string | null;
    enabled?: boolean;
  }) => {
    const db = getDb();
    const data: Record<string, unknown> = {
      updatedAt: new Date().toISOString()
    };
    if (input.name !== undefined) data.name = input.name;
    if (input.capabilities !== undefined) data.capabilities = JSON.stringify(input.capabilities);
    if (input.metadata !== undefined) data.metadata = input.metadata;
    if (input.enabled !== undefined) data.enabled = input.enabled;

    const updatedModel = await db.update(models)
      .set(data)
      .where(eq(models.id, input.id))
      .returning()
      .get();

    const providerObj = await db.select({
      id: providers.id,
      name: providers.name,
      type: providers.type,
      enabled: providers.enabled,
    }).from(providers).where(eq(providers.id, updatedModel.providerId)).get();

    return {
      ...updatedModel,
      provider: providerObj,
    };
  });

  ipcMain.handle("models:delete", async (_e, id: string) => {
    const db = getDb();
    await db.delete(models).where(eq(models.id, id));
  });
}
