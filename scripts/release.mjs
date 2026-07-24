#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const input = process.argv[2];
if (!input) {
  console.error("Usage: pnpm release <version>   e.g. pnpm release 0.2.0");
  process.exit(1);
}

const version = input.replace(/^v/, "");
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`Invalid version: ${input}`);
  process.exit(1);
}

const files = [
  "package.json",
  "apps/web/package.json",
  "apps/desktop/package.json",
  "packages/contracts/package.json",
  "packages/db/package.json",
  "packages/ai-runtime/package.json",
  "packages/services/package.json",
  "packages/frontend/package.json",
  "packages/config/package.json",
];

for (const f of files) {
  const pkg = JSON.parse(readFileSync(f, "utf8"));
  pkg.version = version;
  writeFileSync(f, JSON.stringify(pkg, null, 2) + "\n");
}

const tag = `v${version}`;
console.log(`\nBumped ${files.length} package.json files to ${version}.`);
console.log("\nNext, commit, tag, and push manually:");
console.log('  git add package.json apps/web/package.json apps/desktop/package.json packages/*/package.json');
console.log(`  git commit -m "chore(release): ${tag}"`);
console.log(`  git tag ${tag}`);
console.log("  git push --follow-tags");
console.log(`\nPushing the ${tag} tag triggers the release build in CI.`);
