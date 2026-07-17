import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as path from "node:path";
import { existsSync } from "node:fs";

export function runMigrations(db: BetterSQLite3Database<any>, migrationsFolder?: string) {
  // Resolve migrations path dynamically
  let folder = migrationsFolder;
  if (!folder) {
    const distPath = path.resolve(__dirname, "../migrations");
    const srcPath = path.resolve(__dirname, "../../migrations");
    const relativeRootPath = path.resolve(process.cwd(), "../../packages/db/migrations");
    const localPath = path.resolve(process.cwd(), "./packages/db/migrations");

    if (existsSync(distPath)) {
      folder = distPath;
    } else if (existsSync(srcPath)) {
      folder = srcPath;
    } else if (existsSync(relativeRootPath)) {
      folder = relativeRootPath;
    } else {
      folder = localPath;
    }
  }

  migrate(db, { migrationsFolder: folder });
}
