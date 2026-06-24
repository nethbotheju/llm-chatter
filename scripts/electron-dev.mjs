#!/usr/bin/env node
import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";
import net from "node:net";

const PORT = 5173; // separate from 3000 so web and desktop can run side by side

function isPortOpen(port) {
  return new Promise((resolve) => {
    const sock = net.connect(port, "127.0.0.1");
    sock.once("connect", () => {
      sock.destroy();
      resolve(true);
    });
    sock.once("error", () => resolve(false));
  });
}

async function waitForServer(port, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) return;
    await wait(500);
  }
  throw new Error(
    `Next.js dev server did not start on port ${port} within ${timeoutMs}ms`,
  );
}

async function main() {
  // 1. Start Next.js dev server on PORT
  // Note: we do NOT set BUILD_TARGET=desktop in dev — that's only for the
  // production static export build. In dev, we want the full Next.js dev
  // server (including API routes) so the renderer can talk to /api/*.
  const next = spawn(
    "pnpm",
    ["next", "dev", "--turbopack", "-p", String(PORT)],
    {
      stdio: "inherit",
      env: { ...process.env },
    },
  );

  process.on("SIGINT", () => {
    next.kill("SIGINT");
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    next.kill("SIGTERM");
    process.exit(0);
  });

  // 2. Wait for it
  await waitForServer(PORT);
  console.log(`[electron-dev] Next.js ready on http://localhost:${PORT}`);

  // 3. Start Electron in dev mode, pointed at the dev server
  const electron = spawn("pnpm", ["exec", "electron-vite", "dev"], {
    stdio: "inherit",
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: `http://localhost:${PORT}`,
    },
  });

  electron.on("exit", (code) => {
    next.kill("SIGTERM");
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error("[electron-dev]", err);
  process.exit(1);
});
