#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { copyFileSync } from "node:fs";

const PKG = "package.json";
const BACKUP = ".package-bak.json";

// Only the runtime deps the Electron main process + chat-worker require at runtime.
// Derived from the external require() calls in dist-electron/main (see build verification).
const RUNTIME_DEPS = [
  "@ai-sdk/anthropic",
  "@ai-sdk/google",
  "@ai-sdk/mcp",
  "@ai-sdk/openai",
  "@mozilla/readability",
  "ai",
  "electron-updater",
  "jsdom",
  "nanoid",
  "turndown",
  "zod",
];

function main() {
  if (!existsSync(PKG)) {
    console.error("[electron-package] package.json not found");
    process.exit(1);
  }

  const original = JSON.parse(readFileSync(PKG, "utf8"));
  copyFileSync(PKG, BACKUP);

  const trimmed = { ...original };
  const allDeps = { ...original.dependencies };
  const runtimeDependencies = {};
  for (const name of RUNTIME_DEPS) {
    if (!(name in allDeps)) {
      console.error(`[electron-package] runtime dep "${name}" missing from package.json dependencies`);
      process.exit(1);
    }
    runtimeDependencies[name] = allDeps[name];
  }
  trimmed.dependencies = runtimeDependencies;
  delete trimmed.devDependencies;
  delete trimmed.pnpm;

  try {
    console.log("[electron-package] Temporarily trimming package.json to runtime deps only...");
    writeFileSync(PKG, JSON.stringify(trimmed, null, 2) + "\n", "utf8");

    console.log(`[electron-package] Running electron-builder ${process.argv.slice(2).join(" ") || "(default target)"}...`);
    const result = spawnSync("pnpm", ["exec", "electron-builder", ...process.argv.slice(2)], {
      stdio: "inherit",
    });
    const code = result.status ?? 1;
    if (code !== 0) process.exit(code);
  } finally {
    copyFileSync(BACKUP, PKG);
    rmSync(BACKUP, { force: true });
    console.log("[electron-package] Restored package.json");
  }
}

main();
