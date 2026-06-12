#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { renameSync, existsSync, rmSync, readdirSync, cpSync } from "node:fs";
import { join } from "node:path";

const apiDir = "src/app/api";
const apiBackup = ".api-bak";

const needsMove = existsSync(apiDir);
if (needsMove) {
  console.log("[electron-build] Temporarily moving API routes for static export...");
  renameSync(apiDir, apiBackup);
}

try {
  console.log("[electron-build] Generating Prisma client...");
  const prisma = spawnSync("pnpm", ["prisma", "generate"], { stdio: "inherit" });
  if (prisma.status !== 0) process.exit(prisma.status ?? 1);

  // Copy .prisma from pnpm virtual store to node_modules/.prisma (for web mode)
  const nmDir = join(process.cwd(), "node_modules");
  const pnpmDir = join(nmDir, ".pnpm");
  const dotPrismaDir = join(nmDir, ".prisma");
  try { rmSync(dotPrismaDir, { recursive: true, force: true }); } catch {}
  for (const entry of readdirSync(pnpmDir)) {
    if (entry.startsWith("@prisma+client@")) {
      const src = join(pnpmDir, entry, "node_modules", ".prisma");
      if (existsSync(src)) { cpSync(src, dotPrismaDir, { recursive: true }); break; }
    }
  }

  console.log("[electron-build] Building Next.js static export...");
  const next = spawnSync("pnpm", ["next", "build"], {
    stdio: "inherit",
    env: { ...process.env, BUILD_TARGET: "desktop" },
  });
  if (next.status !== 0) process.exit(next.status ?? 1);

  console.log("[electron-build] Bundling Electron main + preload...");
  const vite = spawnSync("pnpm", ["exec", "electron-vite", "build"], { stdio: "inherit" });
  if (vite.status !== 0) process.exit(vite.status ?? 1);

  // Copy standalone Prisma client to dist-electron/main/db/generated/ so it's found at runtime.
  // rollup externalizes the import, so require("./db/generated") resolves relative to dist-electron/main/.
  const generatedSrc = join(process.cwd(), "electron", "db", "generated");
  const generatedDst = join(process.cwd(), "dist-electron", "main", "db", "generated");
  if (existsSync(generatedSrc)) {
    cpSync(generatedSrc, generatedDst, { recursive: true });
    console.log("[electron-build] Copied Prisma client to dist-electron/main/db/generated/");
  } else {
    console.error("[electron-build] Error: electron/db/generated not found");
    process.exit(1);
  }

  console.log("[electron-build] Done. Run `pnpm electron:build:dist` to package.");
} finally {
  if (needsMove && existsSync(apiBackup)) {
    console.log("[electron-build] Restoring API routes...");
    renameSync(apiBackup, apiDir);
  }
}