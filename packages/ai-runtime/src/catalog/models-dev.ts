// models.dev catalog source: types, URL, and pure mappers.
// No I/O here — kept pure so it can be imported by both the web server
// (Next API routes) and the Electron main process.

export const MODELS_DEV_URL =
  process.env.MODELS_DEV_URL?.trim() || "https://models.dev/api.json";

export interface ModelsDevModality {
  input?: string[];
  output?: string[];
}

export interface ModelsDevLimit {
  context?: number;
  input?: number;
  output?: number;
}

export interface ModelsDevCost {
  input?: number;
  output?: number;
  cache_read?: number;
  cache_write?: number;
}

export interface ModelsDevModel {
  id: string;
  name?: string;
  family?: string;
  attachment?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  structured_output?: boolean;
  temperature?: boolean;
  knowledge?: string;
  release_date?: string;
  last_updated?: string;
  modalities?: ModelsDevModality;
  open_weights?: boolean;
  limit?: ModelsDevLimit;
  cost?: ModelsDevCost;
}

export interface ModelsDevProvider {
  id: string;
  name: string;
  api?: string;
  env?: string[];
  npm?: string;
  doc?: string;
  models: Record<string, ModelsDevModel>;
}

export type ModelsDevBlob = Record<string, ModelsDevProvider>;

import type { ProviderType } from "../ai/types";

// Provider is importable if it is one of the first-party majors (no base URL
// needed) or exposes a compatible base URL (`api` field). Dedicated-package /
// gateway providers without a base URL are excluded — they can still be added
// manually via the existing compatible forms.
export function isImportableProvider(provider: ModelsDevProvider): boolean {
  if (provider.npm === "@ai-sdk/openai" && !provider.api) return true;
  if (provider.npm === "@ai-sdk/anthropic" && !provider.api) return true;
  if (provider.npm === "@ai-sdk/google" && !provider.api) return true;
  return Boolean(provider.api);
}

export function resolveProviderType(provider: ModelsDevProvider): ProviderType {
  if (provider.npm === "@ai-sdk/openai" && !provider.api) return "openai";
  if (provider.npm === "@ai-sdk/anthropic" && !provider.api) return "anthropic";
  if (provider.npm === "@ai-sdk/google" && !provider.api) return "google";

  if (provider.api) {
    if (provider.npm && provider.npm.includes("anthropic")) {
      return "anthropic-compatible";
    }
    return "openai-compatible";
  }

  return "openai-compatible";
}

export function mapModelCapabilities(model: ModelsDevModel): string[] {
  const caps: string[] = ["chat"];
  const inputs = model.modalities?.input ?? [];
  if (model.attachment && inputs.includes("image")) caps.push("vision");
  if (model.tool_call) caps.push("tools");
  if (model.reasoning) caps.push("reasoning");
  if (model.structured_output) caps.push("structured");
  return caps;
}

// Curated metadata blob. Excludes niche/volatile fields (status, experimental,
// cost tiers, reasoning_options). Preserves modalities verbatim for future
// attachment/upload support beyond images.
export interface ModelsDevMetadata {
  displayName: string;
  family?: string;
  modalities?: ModelsDevModality;
  limit?: ModelsDevLimit;
  cost?: ModelsDevCost;
  knowledge?: string;
  releaseDate?: string;
  lastUpdated?: string;
  temperature?: boolean;
  openWeights?: boolean;
}

export function mapModelMetadata(model: ModelsDevModel): ModelsDevMetadata {
  const meta: ModelsDevMetadata = { displayName: model.name || model.id };
  if (model.family !== undefined) meta.family = model.family;
  if (model.modalities !== undefined) meta.modalities = model.modalities;
  if (model.limit !== undefined) meta.limit = model.limit;
  if (model.cost !== undefined) meta.cost = model.cost;
  if (model.knowledge !== undefined) meta.knowledge = model.knowledge;
  if (model.release_date !== undefined) meta.releaseDate = model.release_date;
  if (model.last_updated !== undefined) meta.lastUpdated = model.last_updated;
  if (model.temperature !== undefined) meta.temperature = model.temperature;
  if (model.open_weights !== undefined) meta.openWeights = model.open_weights;
  return meta;
}

export interface ProviderCatalogItem {
  catalogId: string;
  name: string;
  type: ProviderType;
  baseUrl: string | null;
  modelCount: number;
  doc: string | null;
}

// Project the full blob into the small browse list persisted to disk.
export function projectProviderList(
  blob: ModelsDevBlob,
): ProviderCatalogItem[] {
  const items: ProviderCatalogItem[] = [];
  for (const provider of Object.values(blob)) {
    if (!isImportableProvider(provider)) continue;
    items.push({
      catalogId: provider.id,
      name: provider.name,
      type: resolveProviderType(provider),
      baseUrl: provider.api ?? null,
      modelCount: Object.keys(provider.models || {}).length,
      doc: provider.doc ?? null,
    });
  }
  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}

export interface ModelCatalogItem {
  id: string;
  displayName: string;
  capabilities: string[];
  contextLimit: number;
  outputLimit?: number;
  inputModalities: string[];
  outputModalities: string[];
  knowledge?: string;
  releaseDate?: string;
  lastUpdated?: string;
  cost: ModelsDevCost | null;
}

// Project a single provider's models into a preview shape for the browse UI.
export function projectProviderModels(
  provider: ModelsDevProvider,
): ModelCatalogItem[] {
  return Object.values(provider.models || {}).map((model) => ({
    id: model.id,
    displayName: model.name || model.id,
    capabilities: mapModelCapabilities(model),
    contextLimit: model.limit?.context ?? 0,
    outputLimit: model.limit?.output,
    inputModalities: model.modalities?.input ?? ["text"],
    outputModalities: model.modalities?.output ?? ["text"],
    knowledge: model.knowledge,
    releaseDate: model.release_date,
    lastUpdated: model.last_updated,
    cost: model.cost ?? null,
  }));
}
