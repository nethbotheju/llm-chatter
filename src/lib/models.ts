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

// Attachment kinds supported by the app today. Audio/video modalities are
// accepted by some models but intentionally out of scope until a later phase.
export type AttachmentKind = "image" | "pdf";

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_PDF_SIZE = 20 * 1024 * 1024;

// Attachment kinds the app will let the user pick for a given model. Image
// support is inferred from EITHER the "vision" capability OR the image input
// modality, because catalog data is inconsistent: many vision-capable models
// carry an empty modalities.input. PDF is only signalled via modalities.
export function getAcceptedAttachmentKinds(
  capabilities: string,
  metadata?: string | null,
): AttachmentKind[] {
  const caps = parseModelCapabilities(capabilities);
  const types = getAttachmentTypes(metadata);
  const kinds: AttachmentKind[] = [];
  if (types.includes("image") || caps.includes("vision")) kinds.push("image");
  if (types.includes("pdf")) kinds.push("pdf");
  return kinds;
}

// HTML <input accept> string for the model's accepted kinds (e.g.
// "image/*,application/pdf"). Empty string means the model accepts nothing.
export function getAcceptedMimeAccept(
  capabilities: string,
  metadata?: string | null,
): string {
  const kinds = getAcceptedAttachmentKinds(capabilities, metadata);
  const parts: string[] = [];
  if (kinds.includes("image")) parts.push("image/*");
  if (kinds.includes("pdf")) parts.push("application/pdf");
  return parts.join(",");
}

// Map a concrete file MIME type to a supported attachment kind, or null when
// the type is outside v1 scope (e.g. audio/video).
export function kindForMediaType(mediaType: string): AttachmentKind | null {
  if (mediaType.startsWith("image/")) return "image";
  if (mediaType === "application/pdf") return "pdf";
  return null;
}

export interface AttachmentValidation {
  ok: boolean;
  error?: string;
}

export function validateAttachmentFile(file: File): AttachmentValidation {
  const kind = kindForMediaType(file.type);
  if (!kind) {
    return { ok: false, error: `"${file.name}" is not a supported file type` };
  }
  const limit = kind === "image" ? MAX_IMAGE_SIZE : MAX_PDF_SIZE;
  if (file.size > limit) {
    const mb = Math.round(limit / (1024 * 1024));
    return { ok: false, error: `"${file.name}" exceeds the ${mb}MB limit` };
  }
  return { ok: true };
}
