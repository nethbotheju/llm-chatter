import { getPrisma } from "./client";

interface MigrationFile {
  name: string;
  sql: string;
}

const migrationModules = import.meta.glob("../../prisma/migrations/*/migration.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function loadMigrations(): MigrationFile[] {
  const list: MigrationFile[] = [];
  for (const [path, sql] of Object.entries(migrationModules)) {
    const match = path.match(/prisma\/migrations\/([^/]+)\/migration\.sql$/);
    if (!match) continue;
    list.push({ name: match[1], sql });
  }
  list.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return list;
}

function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = "";
  let word = "";
  let beginDepth = 0;
  let inSingle = false;
  let inDouble = false;
  let lineComment = false;
  let blockComment = false;

  const flushWord = () => {
    const up = word.toUpperCase();
    if (up === "BEGIN") beginDepth += 1;
    else if (up === "END") beginDepth = Math.max(0, beginDepth - 1);
    word = "";
  };

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const nx = sql[i + 1] ?? "";

    if (lineComment) {
      buf += ch;
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      buf += ch;
      if (ch === "*" && nx === "/") {
        buf += nx;
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (inSingle) {
      buf += ch;
      if (ch === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      buf += ch;
      if (ch === '"') inDouble = false;
      continue;
    }
    if (ch === "-" && nx === "-") {
      lineComment = true;
      buf += ch;
      buf += nx;
      i += 1;
      continue;
    }
    if (ch === "/" && nx === "*") {
      blockComment = true;
      buf += ch;
      buf += nx;
      i += 1;
      continue;
    }
    if (ch === "'") {
      flushWord();
      inSingle = true;
      buf += ch;
      continue;
    }
    if (ch === '"') {
      flushWord();
      inDouble = true;
      buf += ch;
      continue;
    }

    if (/[A-Za-z0-9_]/.test(ch)) {
      word += ch;
    } else if (word) {
      flushWord();
    }
    buf += ch;

    if (ch === ";" && beginDepth === 0) {
      const stmt = buf.trim();
      if (stmt) out.push(stmt);
      buf = "";
      word = "";
    }
  }

  if (word) flushWord();
  const tail = buf.trim();
  if (tail) out.push(tail);
  return out;
}

export async function runEmbeddedMigrations(): Promise<void> {
  const prisma = getPrisma();
  const all = loadMigrations();

  if (all.length === 0) {
    throw new Error(
      "No embedded migrations were found. The desktop build likely did not bundle prisma/migrations.",
    );
  }

  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS _app_migrations (
       migration_name TEXT PRIMARY KEY NOT NULL,
       applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`,
  );

  const appliedRows = (await prisma.$queryRawUnsafe(
    `SELECT migration_name FROM _app_migrations`,
  )) as Array<Record<string, string>>;
  let applied = new Set(appliedRows.map((r) => r.migration_name));

  if (applied.size === 0) {
    const legacy = (await prisma.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Provider'`,
    )) as Array<Record<string, string>>;

    if (legacy.length > 0) {
      const baseline = all[0];
      await prisma.$executeRawUnsafe(
        `INSERT INTO _app_migrations (migration_name) VALUES (?)`,
        baseline.name,
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
    await prisma.$transaction(async (tx) => {
      for (const stmt of statements) {
        await tx.$executeRawUnsafe(stmt);
      }
      await tx.$executeRawUnsafe(
        `INSERT INTO _app_migrations (migration_name) VALUES (?)`,
        migration.name,
      );
    });
    console.log(
      `[migrator] applied "${migration.name}" (${statements.length} statement${statements.length === 1 ? "" : "s"})`,
    );
  }
}
