// The catalog reconcile layer constructs Date instances (e.g. lastSyncedAt), and
// Electron IPC preserves them via structured clone — but the renderer's Zod schemas
// expect ISO strings. This utility recursively converts every Date in an object
// graph to an ISO string.

export function serializeDates<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString() as unknown as T;
  if (Array.isArray(obj)) return obj.map(serializeDates) as unknown as T;
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeDates(value);
    }
    return result as T;
  }
  return obj;
}