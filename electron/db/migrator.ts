import { getDb } from "./client";
import { sql } from "drizzle-orm";

interface MigrationFile {
  name: string;
  sql: string;
}

const migrationModules = import.meta.glob("../../drizzle/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function loadMigrations(): MigrationFile[] {
  const list: MigrationFile[] = [];
  for (const [path, sqlText] of Object.entries(migrationModules)) {
    const match = path.match(/drizzle\/([^/]+)\.sql$/);
    if (!match) continue;
    list.push({ name: match[1], sql: sqlText });
  }
  list.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return list;
}

function splitSqlStatements(sqlText: string): string[] {
  return sqlText
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function runEmbeddedMigrations(): Promise<void> {
  const db = getDb();
  const all = loadMigrations();

  if (all.length === 0) {
    throw new Error(
      "No embedded migrations were found. The desktop build likely did not bundle drizzle/ migrations.",
    );
  }

  // Create migrations tracking table if not exists
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS _app_migrations (
       migration_name TEXT PRIMARY KEY NOT NULL,
       applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );

  // Get already-applied migrations
  const appliedRows = (await db.all(
    sql`SELECT migration_name FROM _app_migrations`
  )) as Array<{ migration_name: string }>;
  let applied = new Set(appliedRows.map((r) => r.migration_name));

  // Baseline detection: if DB exists but no tracking table, baseline at first migration
  if (applied.size === 0) {
    const legacy = (await db.all(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Provider'`
    )) as Array<{ name: string }>;

    if (legacy.length > 0) {
      const baseline = all[0];
      await db.run(
        sql`INSERT INTO _app_migrations (migration_name) VALUES (${baseline.name})`
      );
      applied = new Set([baseline.name]);
      console.log(`[migrator] baselined existing desktop database at "${baseline.name}"`);
    }
  }

  const pending = all.filter((m) => !applied.has(m.name));
  if (pending.length === 0) {
    console.log("[migrator] database schema is up to date");
    return;
  }

  for (const migration of pending) {
    const statements = splitSqlStatements(migration.sql);
    await db.transaction(async (tx) => {
      for (const stmt of statements) {
        // Run raw statements safely using tx.run(sql.raw(...)) since migrations contain raw SQL syntax
        await tx.run(sql.raw(stmt));
      }
      await tx.run(
        sql`INSERT INTO _app_migrations (migration_name) VALUES (${migration.name})`
      );
    });
    console.log(
      `[migrator] applied "${migration.name}" (${statements.length} statement${statements.length === 1 ? "" : "s"})`,
    );
  }
}
