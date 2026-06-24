import { ipcMain } from "electron";
import { join } from "node:path";
import { nanoid } from "nanoid";
import { getPrisma, getDataDir } from "../db/client";
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
  const prisma = getPrisma();
  return {
    encrypt,
    findImportedProviders: () =>
      prisma.provider.findMany({
        where: { catalogId: { not: null } },
        select: { id: true, catalogId: true, lastSyncedAt: true },
      }),
    findProviderByCatalogId: (catalogId) =>
      prisma.provider.findUnique({
        where: { catalogId },
        select: { id: true },
      }),
    createProvider: ({ catalogId, name, type, baseUrl, apiKeyEncrypted }) =>
      prisma.provider.create({
        data: {
          id: nanoid(),
          catalogId,
          name,
          type,
          baseUrl,
          apiKeyEncrypted,
          enabled: true,
        },
        select: { id: true },
      }),
    touchProviderApiKey: (providerId, apiKeyEncrypted) =>
      prisma.provider.update({
        where: { id: providerId },
        data: { apiKeyEncrypted },
      }),
    findModelsByProvider: (providerId) =>
      prisma.model.findMany({
        where: { providerId },
        select: { id: true, catalogModelId: true, enabled: true },
      }),
    createModel: ({
      providerId,
      name,
      catalogModelId,
      capabilities,
      metadata,
      enabled,
    }) =>
      prisma.model.create({
        data: {
          id: nanoid(),
          providerId,
          name,
          catalogModelId,
          capabilities,
          metadata,
          enabled,
        },
      }),
    updateSyncedModel: ({ modelId, capabilities, metadata }) =>
      prisma.model.update({
        where: { id: modelId },
        data: { capabilities, metadata },
      }),
    disableModel: (modelId) =>
      prisma.model.update({ where: { id: modelId }, data: { enabled: false } }),
    touchProviderLastSynced: (providerId) =>
      prisma.provider.update({
        where: { id: providerId },
        data: { lastSyncedAt: new Date() },
      }),
  };
}

export function registerCatalogIpc() {
  ipcMain.handle("catalog:listProviders", async (_e, query?: string) => {
    const providers = await getProvidersList(getCatalogDir());
    const q = query?.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter(
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
