import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

function getDbPath(): string {
  const url = process.env.DATABASE_URL ?? "file:../../dev.db";
  return url.replace(/^file:/, "");
}

const globalForDb = globalThis as unknown as { __llmChatterDb?: ReturnType<typeof createDb> };

function createDb() {
  const sqlite = new Database(getDbPath());
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export type DbClient = ReturnType<typeof createDb>;

// The connection MUST be created lazily (on first use), never at import time.
// This package is imported by the Electron main process purely for its schema
// (the desktop ships its own connection in apps/desktop/electron/db/client.ts,
// pointing at the writable userData dir). Opening a connection at import would
// resolve the path relative to the read-only app.asar and crash the packaged
// desktop app at startup ("unable to open database file").
export function getDb(): DbClient {
  if (globalForDb.__llmChatterDb) return globalForDb.__llmChatterDb;
  const instance = createDb();
  globalForDb.__llmChatterDb = instance;
  return instance;
}

// Backwards-compatible lazy `db`. Existing call sites do `db.select(...)` etc.;
// the proxy forwards every access to the real (lazily created) drizzle instance
// so no consumer needs to change. The connection is opened on first access only.
export const db: DbClient = new Proxy({} as DbClient, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});
