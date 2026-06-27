export function parseModelCapabilities(capabilities: string): string[] {
  try {
    return JSON.parse(capabilities);
  } catch {
    return [];
  }
}

export function hasVisionCapability(capabilities: string): boolean {
  return parseModelCapabilities(capabilities).includes("vision");
}

export interface ModelModalities {
  input?: string[];
  output?: string[];
}

export interface ModelLimit {
  context?: number;
  input?: number;
  output?: number;
}

export interface ModelCost {
  input?: number;
  output?: number;
  cache_read?: number;
  cache_write?: number;
}

export interface ModelMetadata {
  displayName?: string;
  family?: string;
  modalities?: ModelModalities;
  limit?: ModelLimit;
  cost?: ModelCost;
  knowledge?: string;
  releaseDate?: string;
  lastUpdated?: string;
  temperature?: boolean;
  openWeights?: boolean;
}

// Parse the model metadata JSON blob. Returns an empty object on parse
// failure so callers can safely read optional fields.
export function parseModelMetadata(metadata?: string | null): ModelMetadata {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata) as ModelMetadata;
  } catch {
    return {};
  }
}

// Friendly display name for a model. Catalog-imported models store the human
// name in metadata.displayName; Model.name holds the SDK id. Falls back to
// name for manually-created models.
export function getModelDisplayName(
  name: string,
  metadata?: string | null,
): string {
  return parseModelMetadata(metadata).displayName || name;
}

// Format a token count into a compact human string (128000 -> "128K").
export function formatContextLimit(limit?: number): string {
  if (!limit || limit <= 0) return "";
  if (limit >= 1000000) return `${(limit / 1000000).toFixed(1)}M`;
  return `${Math.round(limit / 1000)}K`;
}

// Input modalities other than text (e.g. image, pdf, audio, video), used to
// show what attachment types a model accepts.
export function getAttachmentTypes(metadata?: string | null): string[] {
  const inputs = parseModelMetadata(metadata).modalities?.input ?? [];
  return inputs.filter((m) => m !== "text");
}
