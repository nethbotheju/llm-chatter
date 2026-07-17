import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@llm-chatter/db";
import type { DbClient } from "@llm-chatter/db";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { app } from "electron";

export type { DbClient };

export function getDataDir(): string {
  const dir = join(app.getPath("userData"), "llm-chatter");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

let dbInstance: DbClient | null = null;

export function getDb(): DbClient {
  if (!dbInstance) {
    const dataDir = getDataDir();
    const dbPath = join(dataDir, "llm-chatter.db");
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    dbInstance = drizzle(sqlite, { schema }) as DbClient;
  }
  return dbInstance;
}
