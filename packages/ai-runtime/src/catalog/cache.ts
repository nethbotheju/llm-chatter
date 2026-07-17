// Catalog cache: fetch the models.dev blob with single-flight dedupe, and
// persist the small provider browse list to a JSON file on disk.
//
// The full blob (~2 MB) is NEVER held in memory between operations — only the
// small projected list (~30 KB) is persisted. Each fetch opportunistically
// refreshes that list file ("piggyback").

import { promises as fs } from "node:fs";
import { join } from "node:path";
import {
  MODELS_DEV_URL,
  projectProviderList,
  type ModelsDevBlob,
  type ProviderCatalogItem,
} from "./models-dev";

const PROVIDERS_FILE = "providers.json";
const LIST_TTL_MS = 60 * 60 * 1000; // browse list considered fresh for 1 hour

// Single-flight: concurrent callers share one in-flight fetch, then it clears.
// This is a momentary dedupe, NOT a long-lived cache of the blob.
let blobInFlight: Promise<ModelsDevBlob> | null = null;

export async function fetchCatalogBlob(): Promise<ModelsDevBlob> {
  if (blobInFlight) return blobInFlight;
  blobInFlight = (async () => {
    const res = await fetch(MODELS_DEV_URL, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to fetch models.dev catalog: ${res.status}`);
    }
    const blob = (await res.json()) as ModelsDevBlob;
    return blob;
  })();
  try {
    return await blobInFlight;
  } finally {
    blobInFlight = null;
  }
}

interface ProvidersCacheFile {
  fetchedAt: string;
  providers: ProviderCatalogItem[];
}

export async function readProvidersCache(
  dir: string,
): Promise<ProvidersCacheFile | null> {
  try {
    const raw = await fs.readFile(join(dir, PROVIDERS_FILE), "utf8");
    return JSON.parse(raw) as ProvidersCacheFile;
  } catch {
    return null;
  }
}

export async function writeProvidersCache(
  dir: string,
  providers: ProviderCatalogItem[],
): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  const file: ProvidersCacheFile = {
    fetchedAt: new Date().toISOString(),
    providers,
  };
  await fs.writeFile(join(dir, PROVIDERS_FILE), JSON.stringify(file), "utf8");
}

// Fetch the blob, project the small list, and persist it. Returns the list.
export async function refreshProvidersList(
  dir: string,
): Promise<ProviderCatalogItem[]> {
  const blob = await fetchCatalogBlob();
  const list = projectProviderList(blob);
  await writeProvidersCache(dir, list);
  return list;
}

// Return the browse list, refreshing from source if the file is missing or
// older than the TTL.
export async function getProvidersList(
  dir: string,
): Promise<ProviderCatalogItem[]> {
  const cached = await readProvidersCache(dir);
  const stale =
    !cached || Date.now() - new Date(cached.fetchedAt).getTime() > LIST_TTL_MS;
  if (stale) {
    return refreshProvidersList(dir);
  }
  return cached.providers;
}
