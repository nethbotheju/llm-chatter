#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { renameSync, existsSync } from "node:fs";

const apiDir = "src/app/api";
const apiBackup = ".api-bak";

// Step 1: Temporarily move API routes out of the way for static export
const needsMove = existsSync(apiDir);
if (needsMove) {
  console.log("[electron-build] Temporarily moving API routes for static export...");
  renameSync(apiDir, apiBackup);
}

try {
  // Step 2: Build the Next.js static export
  console.log("[electron-build] Building Next.js static export...");
  const next = spawnSync("pnpm", ["next", "build"], {
    stdio: "inherit",
    env: { ...process.env, BUILD_TARGET: "desktop" },
  });
  if (next.status !== 0) process.exit(next.status ?? 1);

  // Step 3: Bundle main + preload with electron-vite
  console.log("[electron-build] Bundling Electron main + preload...");
  const vite = spawnSync("pnpm", ["exec", "electron-vite", "build"], {
    stdio: "inherit",
  });
  if (vite.status !== 0) process.exit(vite.status ?? 1);

  console.log("[electron-build] Done. Run `pnpm electron:build:dist` to package.");
} finally {
  // Step 4: Restore API routes
  if (needsMove && existsSync(apiBackup)) {
    console.log("[electron-build] Restoring API routes...");
    renameSync(apiBackup, apiDir);
  }
}
