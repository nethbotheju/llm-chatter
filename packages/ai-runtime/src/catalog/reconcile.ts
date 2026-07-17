// Catalog import/sync reconciliation logic.
//
// Shared between web (Next API routes) and desktop (Electron IPC). Both pass
// an injected `CatalogStore` that wraps their own Prisma client + encryption,
// following the same pattern as the chat runtime's ChatConfigStore.

import { fetchCatalogBlob } from "./cache";
import {
  isImportableProvider,
  mapModelCapabilities,
  mapModelMetadata,
  resolveProviderType,
  type ModelsDevBlob,
  type ModelsDevModel,
  type ModelsDevProvider,
} from "./models-dev";

export interface ImportedProviderRow {
  id: string;
  catalogId: string | null;
  lastSyncedAt: Date | null;
}

export interface ImportedModelRow {
  id: string;
  catalogModelId: string | null;
  enabled: boolean;
}

export interface CatalogStore {
  encrypt(text: string): string;
  findImportedProviders(): Promise<ImportedProviderRow[]>;
  findProviderByCatalogId(catalogId: string): Promise<{ id: string } | null>;
  createProvider(input: {
    catalogId: string;
    name: string;
    type: string;
    baseUrl: string | null;
    apiKeyEncrypted: string;
  }): Promise<{ id: string }>;
  touchProviderApiKey(providerId: string, apiKeyEncrypted: string): Promise<unknown>;
  findModelsByProvider(providerId: string): Promise<ImportedModelRow[]>;
  createModel(input: {
    providerId: string;
    name: string;
    catalogModelId: string;
    capabilities: string;
    metadata: string;
    enabled: boolean;
  }): Promise<unknown>;
  updateSyncedModel(input: {
    modelId: string;
    capabilities: string;
    metadata: string;
  }): Promise<unknown>;
  disableModel(modelId: string): Promise<unknown>;
  touchProviderLastSynced(providerId: string): Promise<unknown>;
}

export interface ImportResult {
  providerId: string;
  created: boolean;
  modelCount: number;
}

export interface SyncResult {
  providerId: string;
  inserted: number;
  updated: number;
  disabled: number;
}

function entryFor(blob: ModelsDevBlob, catalogId: string): ModelsDevProvider {
  const entry = blob[catalogId];
  if (!entry) {
    throw new Error(`Provider "${catalogId}" not found in catalog`);
  }
  if (!isImportableProvider(entry)) {
    throw new Error(
      `Provider "${catalogId}" has no base URL and cannot be imported`,
    );
  }
  return entry;
}

function capabilitiesFor(model: ModelsDevModel): string {
  return JSON.stringify(mapModelCapabilities(model));
}

function metadataFor(model: ModelsDevModel): string {
  return JSON.stringify(mapModelMetadata(model));
}

export async function importProvider(
  store: CatalogStore,
  input: { catalogId: string; apiKey: string; baseUrlOverride?: string | null },
): Promise<ImportResult> {
  const blob = await fetchCatalogBlob();
  const entry = entryFor(blob, input.catalogId);

  const type = resolveProviderType(entry);
  const baseUrl =
    input.baseUrlOverride !== undefined && input.baseUrlOverride !== null
      ? input.baseUrlOverride
      : (entry.api ?? null);

  const existing = await store.findProviderByCatalogId(input.catalogId);
  const created = !existing;

  let providerId: string;
  if (existing) {
    providerId = existing.id;
    await store.touchProviderApiKey(providerId, store.encrypt(input.apiKey));
    const resync = await syncProvider(store, { providerId, blob });
    return {
      providerId,
      created: false,
      modelCount: resync.inserted + resync.updated,
    };
  }

  providerId = await store
    .createProvider({
      catalogId: input.catalogId,
      name: entry.name,
      type,
      baseUrl,
      apiKeyEncrypted: store.encrypt(input.apiKey),
    })
    .then((p) => p.id);

  let count = 0;
  for (const model of Object.values(entry.models || {})) {
    await store.createModel({
      providerId,
      name: model.id,
      catalogModelId: model.id,
      capabilities: capabilitiesFor(model),
      metadata: metadataFor(model),
      enabled: true,
    });
    count += 1;
  }
  await store.touchProviderLastSynced(providerId);

  return { providerId, created, modelCount: count };
}

export async function syncProvider(
  store: CatalogStore,
  input: { providerId: string; blob?: ModelsDevBlob },
): Promise<SyncResult> {
  const imported = await store.findImportedProviders();
  const provider = imported.find((p) => p.id === input.providerId);
  if (!provider || !provider.catalogId) {
    throw new Error(`Provider ${input.providerId} is not catalog-imported`);
  }

  const blob = input.blob ?? (await fetchCatalogBlob());
  const entry = blob[provider.catalogId];
  if (!entry) {
    throw new Error(
      `Catalog provider "${provider.catalogId}" no longer exists`,
    );
  }

  const dbModels = await store.findModelsByProvider(input.providerId);
  const byCatalogId = new Map(
    dbModels
      .filter((m) => m.catalogModelId)
      .map((m) => [m.catalogModelId as string, m]),
  );

  const seenCatalogIds = new Set<string>();
  let inserted = 0;
  let updated = 0;

  for (const model of Object.values(entry.models || {})) {
    seenCatalogIds.add(model.id);
    const existing = byCatalogId.get(model.id);
    const caps = capabilitiesFor(model);
    const meta = metadataFor(model);
    if (existing) {
      await store.updateSyncedModel({
        modelId: existing.id,
        capabilities: caps,
        metadata: meta,
      });
      updated += 1;
    } else {
      await store.createModel({
        providerId: input.providerId,
        name: model.id,
        catalogModelId: model.id,
        capabilities: caps,
        metadata: meta,
        enabled: true,
      });
      inserted += 1;
    }
  }

  let disabled = 0;
  for (const model of dbModels) {
    if (model.catalogModelId && !seenCatalogIds.has(model.catalogModelId)) {
      await store.disableModel(model.id);
      disabled += 1;
    }
  }

  await store.touchProviderLastSynced(input.providerId);

  return { providerId: input.providerId, inserted, updated, disabled };
}

export async function syncStaleProviders(
  store: CatalogStore,
  thresholdMs: number,
): Promise<SyncResult[]> {
  const imported = await store.findImportedProviders();
  const now = Date.now();
  const stale = imported.filter(
    (p) => p.lastSyncedAt === null || now - p.lastSyncedAt.getTime() > thresholdMs,
  );
  if (stale.length === 0) return [];

  const blob = await fetchCatalogBlob();
  const results: SyncResult[] = [];
  for (const provider of stale) {
    results.push(await syncProvider(store, { providerId: provider.id, blob }));
  }
  return results;
}
