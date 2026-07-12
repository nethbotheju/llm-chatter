import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../../src/lib/db/schema";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { app } from "electron";

export function getDataDir(): string {
  const dir = join(app.getPath("userData"), "llm-chatter");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!dbInstance) {
    const dataDir = getDataDir();
    const dbPath = join(dataDir, "llm-chatter.db");
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    dbInstance = drizzle(sqlite, { schema });
  }
  return dbInstance;
}

export type DbClient = ReturnType<typeof drizzle>;
