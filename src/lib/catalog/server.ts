// Web server-side catalog helpers: resolves the on-disk catalog directory
// (sibling to the database) and builds a Prisma-backed CatalogStore.
//
// Electron mirrors this in electron/ipc/catalog.ts with its own Prisma client
// and encryption.

import { dirname, join, resolve } from "node:path";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { providers, models } from "@/lib/db/schema";
import { eq, isNotNull } from "drizzle-orm";
import { encrypt } from "@/lib/ai/encryption";
import type { CatalogStore } from "./reconcile";

export function getWebCatalogDir(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const match = url.match(/^file:(.+)$/);
  const dbPath = match ? match[1] : "./dev.db";
  return resolve(join(dirname(dbPath), "catalog"));
}

export function createWebCatalogStore(): CatalogStore {
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
    createModel: async ({ providerId, name, catalogModelId, capabilities, metadata, enabled }) => {
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
