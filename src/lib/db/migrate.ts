import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as path from "node:path";

export function runMigrations(db: BetterSQLite3Database<any>) {
  // Locate the drizzle migration folder.
  // In development/production web mode, it is at the project root folder `drizzle`.
  // Since this file is in `src/lib/db/migrate.ts` -> back 3 directories to reach root.
  const migrationsFolder = path.resolve(process.cwd(), "./drizzle");
  migrate(db, { migrationsFolder });
}
