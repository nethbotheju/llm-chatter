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

export interface ModelMetadata {
  displayName?: string;
  [key: string]: unknown;
}

// Friendly display name for a model. Catalog-imported models store the human
// name in metadata.displayName; Model.name holds the SDK id. Falls back to
// name for manually-created models.
export function getModelDisplayName(
  name: string,
  metadata?: string | null,
): string {
  if (!metadata) return name;
  try {
    const parsed = JSON.parse(metadata) as ModelMetadata;
    return parsed.displayName || name;
  } catch {
    return name;
  }
}
