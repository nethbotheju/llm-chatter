import { execSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, rmSync, writeFileSync, unlinkSync, createWriteStream } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const DIST_DIR = resolve(root, "desktop-runtime/dist");
const DIST_CJS = resolve(DIST_DIR, "server.cjs");
const BIN_DIR = resolve(root, "desktop-runtime/bin");
const SEA_BLOB = resolve(BIN_DIR, "sea-prep.blob");
const SEA_OUTPUT = resolve(BIN_DIR, "desktop-runtime");
const TAURI_BINARIES_DIR = resolve(root, "src-tauri/binaries");
const SEA_CONFIG = resolve(BIN_DIR, "sea-config.json");
const NODE_BIN_CACHE = resolve(BIN_DIR, "node-official.bin");

function getTargetTriple() {
  const arch = process.arch === "arm64" ? "aarch64" : process.arch === "x64" ? "x86_64" : process.arch;
  const platform = process.platform === "darwin" ? "apple-darwin" : process.platform === "linux" ? "unknown-linux" : "pc-windows-msvc";
  return `${arch}-${platform}`;
}

function run(cmd, opts) {
  console.log(`  > ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

async function downloadOfficialNodeBinary() {
  if (existsSync(NODE_BIN_CACHE)) {
    console.log("  > Using cached official Node.js binary");
    return NODE_BIN_CACHE;
  }

  const version = process.version;
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  let platform, ext;
  if (process.platform === "darwin") { platform = "darwin"; ext = "tar.gz"; }
  else if (process.platform === "linux") { platform = "linux"; ext = "tar.xz"; }
  else { platform = "win"; ext = "zip"; }

  const filename = `node-${version}-${platform}-${arch}`;
  const url = `https://nodejs.org/dist/${version}/${filename}.${ext}`;
  const binName = process.platform === "win32" ? "node.exe" : "bin/node";

  console.log(`  > Downloading official Node.js ${version} from nodejs.org...`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download Node.js: ${resp.status}`);

  // For tar.gz, extract the node binary from the stream
  if (ext === "tar.gz") {
    const tmpFile = resolve(BIN_DIR, "node-download.tar.gz");
    const tmpStream = createWriteStream(tmpFile);
    await pipeline(Readable.fromWeb(resp.body), tmpStream);

    execSync(`tar -xzf "${tmpFile}" -O "${filename}/${binName}" > "${NODE_BIN_CACHE}"`, { cwd: BIN_DIR });
    unlinkSync(tmpFile);
  } else if (ext === "tar.xz") {
    const tmpFile = resolve(BIN_DIR, "node-download.tar.xz");
    const tmpStream = createWriteStream(tmpFile);
    await pipeline(Readable.fromWeb(resp.body), tmpStream);
    execSync(`tar -xJf "${tmpFile}" -O "${filename}/${binName}" > "${NODE_BIN_CACHE}"`, { cwd: BIN_DIR });
    unlinkSync(tmpFile);
  } else {
    throw new Error(`Unsupported platform for SEA build: ${process.platform}`);
  }

  return NODE_BIN_CACHE;
}

console.log("[1/7] Bundling with esbuild...");
run("node desktop-runtime/build.mjs");

if (!existsSync(DIST_CJS)) {
  console.error("Error: esbuild output not found at", DIST_CJS);
  process.exit(1);
}

console.log("[2/7] Generating SEA blob...");
if (!existsSync(BIN_DIR)) mkdirSync(BIN_DIR, { recursive: true });

writeFileSync(SEA_CONFIG, JSON.stringify({
  main: "desktop-runtime/dist/server.cjs",
  mainFormat: "commonjs",
  output: SEA_BLOB,
  disableExperimentalSEAWarning: true,
  useCodeCache: false,
}, null, 2));

run(`node --experimental-sea-config "${SEA_CONFIG}"`);

if (!existsSync(SEA_BLOB)) {
  console.error("Error: SEA blob not found at", SEA_BLOB);
  process.exit(1);
}

console.log("[3/7] Downloading official Node.js binary (with SEA fuse)...");
const nodeBin = await downloadOfficialNodeBinary();

console.log("[4/7] Creating SEA executable...");
if (existsSync(SEA_OUTPUT)) rmSync(SEA_OUTPUT);
copyFileSync(nodeBin, SEA_OUTPUT);

if (process.platform === "darwin") {
  console.log("  > Removing code signature and quarantine...");
  run(`chmod +w "${SEA_OUTPUT}"`);
  run(`xattr -cr "${SEA_OUTPUT}"`);
  run(`codesign --remove-signature "${SEA_OUTPUT}"`);
}

console.log("  > Injecting SEA blob via postject...");
const postjectArgs = [
  SEA_OUTPUT,
  "NODE_SEA_BLOB",
  SEA_BLOB,
  "--sentinel-fuse", "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
];
if (process.platform === "darwin") {
  postjectArgs.push("--macho-segment-name", "NODE_SEA");
}
run(`npx postject ${postjectArgs.map(a => `"${a}"`).join(" ")}`);

if (process.platform === "darwin") {
  console.log("[5/7] Codesigning (macOS)...");
  run(`codesign --sign - "${SEA_OUTPUT}"`);
} else {
  console.log("[5/7] Skipping codesign (not macOS)...");
}

console.log("[6/7] Copying to Tauri binaries directory...");
const triple = getTargetTriple();
const ext = process.platform === "win32" ? ".exe" : "";
const sidecarName = `desktop-runtime-${triple}${ext}`;
const sidecarDest = resolve(TAURI_BINARIES_DIR, sidecarName);

if (!existsSync(TAURI_BINARIES_DIR)) mkdirSync(TAURI_BINARIES_DIR, { recursive: true });
copyFileSync(SEA_OUTPUT, sidecarDest);

if (process.platform !== "win32") {
  run(`chmod +x "${sidecarDest}"`);
}

console.log("[7/7] Cleaning up...");
try { unlinkSync(SEA_BLOB); } catch {}
try { unlinkSync(SEA_CONFIG); } catch {}
try { unlinkSync(SEA_OUTPUT); } catch {}

console.log(`Done. Sidecar binary: ${sidecarDest}`);
