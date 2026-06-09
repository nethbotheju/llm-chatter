#!/usr/bin/env node
import { notarize } from "@electron/notarize";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const APP_NAME = "llm Chatter.app";

function findAppPath() {
  const releaseDir = join(process.cwd(), "release");
  if (!existsSync(releaseDir)) return null;

  // electron-builder outputs to mac/, mac-arm64/, or mac-universal/
  const candidates = readdirSync(releaseDir)
    .filter((d) => d.startsWith("mac"))
    .map((d) => join(releaseDir, d, APP_NAME));

  return candidates.find((p) => existsSync(p)) ?? null;
}

async function main() {
  const appPath = findAppPath();
  if (!appPath) {
    console.error(
      `Could not find ${APP_NAME} in release/mac*/. Run electron-builder --mac first.`
    );
    process.exit(1);
  }

  const { APPLE_ID, APPLE_ID_PASSWORD, APPLE_TEAM_ID } = process.env;
  if (!APPLE_ID || !APPLE_ID_PASSWORD || !APPLE_TEAM_ID) {
    console.error(
      "Missing APPLE_ID, APPLE_ID_PASSWORD, or APPLE_TEAM_ID in environment."
    );
    process.exit(1);
  }

  console.log(`Notarizing ${appPath}…`);
  await notarize({
    appBundleId: "com.llmchatter.desktop",
    appPath,
    appleId: APPLE_ID,
    appleIdPassword: APPLE_ID_PASSWORD,
    teamId: APPLE_TEAM_ID,
  });
  console.log("Notarized successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
