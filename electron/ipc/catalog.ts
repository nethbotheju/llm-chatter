import { ipcMain } from "electron";
import { join } from "node:path";
import { nanoid } from "nanoid";
import { getDb, getDataDir } from "../db/client";
import { providers, models } from "../../src/lib/db/schema";
import { eq, isNotNull } from "drizzle-orm";
import { encrypt } from "../db/encryption";
import {
  fetchCatalogBlob,
  getProvidersList,
  importProvider,
  syncProvider,
  syncStaleProviders,
  projectProviderModels,
  isImportableProvider,
  type CatalogStore,
} from "../../src/lib/catalog";

const SYNC_THRESHOLD_MS = 24 * 60 * 60 * 1000;

function getCatalogDir(): string {
  return join(getDataDir(), "catalog");
}

function createStore(): CatalogStore {
  const db = getDb();
  return {
    encrypt,
    findImportedProviders: async () => {
      const rows = await db.select({
        id: providers.id,
        catalogId: providers.catalogId,
        lastSyncedAt: providers.lastSyncedAt,
      })
      .from(providers)
      .where(isNotNull(providers.catalogId));

      return rows.map((r) => ({
        id: r.id,
        catalogId: r.catalogId,
        lastSyncedAt: r.lastSyncedAt ? new Date(r.lastSyncedAt) : null,
      }));
    },
    findProviderByCatalogId: async (catalogId) => {
      const row = await db.select({ id: providers.id })
        .from(providers)
        .where(eq(providers.catalogId, catalogId))
        .get();
      return row || null;
    },
    createProvider: async ({ catalogId, name, type, baseUrl, apiKeyEncrypted }) => {
      const now = new Date().toISOString();
      const row = await db.insert(providers)
        .values({
          id: nanoid(),
          catalogId,
          name,
          type,
          baseUrl,
          apiKeyEncrypted,
          enabled: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: providers.id })
        .get();
      return row;
    },
    touchProviderApiKey: async (providerId, apiKeyEncrypted) => {
      await db.update(providers)
        .set({ apiKeyEncrypted, updatedAt: new Date().toISOString() })
        .where(eq(providers.id, providerId));
    },
    findModelsByProvider: async (providerId) => {
      const rows = await db.select({
        id: models.id,
        catalogModelId: models.catalogModelId,
        enabled: models.enabled,
      })
      .from(models)
      .where(eq(models.providerId, providerId));
      return rows;
    },
    createModel: async ({
      providerId,
      name,
      catalogModelId,
      capabilities,
      metadata,
      enabled,
    }) => {
      const now = new Date().toISOString();
      await db.insert(models)
        .values({
          id: nanoid(),
          providerId,
          name,
          catalogModelId,
          capabilities,
          metadata,
          enabled,
          createdAt: now,
          updatedAt: now,
        });
    },
    updateSyncedModel: async ({ modelId, capabilities, metadata }) => {
      await db.update(models)
        .set({ capabilities, metadata, updatedAt: new Date().toISOString() })
        .where(eq(models.id, modelId));
    },
    disableModel: async (modelId) => {
      await db.update(models)
        .set({ enabled: false, updatedAt: new Date().toISOString() })
        .where(eq(models.id, modelId));
    },
    touchProviderLastSynced: async (providerId) => {
      await db.update(providers)
        .set({ lastSyncedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        .where(eq(providers.id, providerId));
    },
  };
}

export function registerCatalogIpc() {
  ipcMain.handle("catalog:listProviders", async (_e, query?: string) => {
    const providersList = await getProvidersList(getCatalogDir());
    const q = query?.trim().toLowerCase();
    if (!q) return providersList;
    return providersList.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.catalogId.toLowerCase().includes(q),
    );
  });

  ipcMain.handle("catalog:listModels", async (_e, catalogProviderId: string) => {
    const blob = await fetchCatalogBlob();
    const provider = blob[catalogProviderId];
    if (!provider || !isImportableProvider(provider)) {
      throw new Error("Provider not found in catalog");
    }
    return projectProviderModels(provider);
  });

  ipcMain.handle(
    "catalog:importProvider",
    async (_e, input: { catalogId: string; apiKey: string; baseUrlOverride?: string | null }) => {
      return importProvider(createStore(), input);
    },
  );

  ipcMain.handle("catalog:syncProvider", async (_e, providerId: string) => {
    return syncProvider(createStore(), { providerId });
  });

  ipcMain.handle("catalog:syncAll", async () => {
    return syncStaleProviders(createStore(), SYNC_THRESHOLD_MS);
  });
}
