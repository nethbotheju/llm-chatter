import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "./client";
import { seedDatabase } from "./seed";
import path from "node:path";
import { app } from "electron";

export async function runMigrations() {
  const db = getDb();

  const migrationsFolder = app.isPackaged
    ? path.join(process.resourcesPath, "app.asar.unpacked", "drizzle")
    : path.join(__dirname, "../../drizzle");

  migrate(db, { migrationsFolder });
  await seedDatabase();
}
