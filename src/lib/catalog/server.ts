// Web server-side catalog helpers: resolves the on-disk catalog directory
// (sibling to the database) and builds a Prisma-backed CatalogStore.
//
// Electron mirrors this in electron/ipc/catalog.ts with its own Prisma client
// and encryption.

import { dirname, join, resolve } from "node:path";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db/client";
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
    createModel: ({ providerId, name, catalogModelId, capabilities, metadata, enabled }) =>
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
