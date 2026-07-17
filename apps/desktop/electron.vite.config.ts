import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "node:path";

// undici@7 added an optional SQLite-backed HTTP cache. It lazily requires
// 'node:sqlite' which is only available in Node.js >= 22.5.0, but Electron 34
// ships Node 20. Because our workspace packages (ai-runtime etc.) transitively
// depend on undici, Rollup inlines it into the bundle, and the require crashes
// Electron at startup before a single line of app code runs.
//
// The fix: use a transform hook to replace the two specific require('node:sqlite')
// call sites inside undici with an empty object stub. The rest of undici stays
// intact and bundled normally. The SQLite cache feature simply won't activate,
// which is correct — the Electron main process never needs HTTP caching.
const stubNodeSqlite = {
  name: "stub-node-sqlite",
  transform(code: string) {
    if (!code.includes("node:sqlite")) return null;
    return {
      code: code.replace(/require\(["']node:sqlite["']\)/g, "{}"),
      map: null,
    };
  },
};

export default defineConfig({
  main: {
    plugins: [
      stubNodeSqlite,
      externalizeDepsPlugin({
        exclude: [
          "@llm-chatter/db",
          "@llm-chatter/ai-runtime",
          "@llm-chatter/contracts",
          "@llm-chatter/services",
          "@ai-sdk/openai",
          "@ai-sdk/anthropic",
          "@ai-sdk/google",
          "@ai-sdk/react",
          "@ai-sdk/mcp",
          "ai",
        ],
      }),
    ],
    build: {
      outDir: "dist-electron/main",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "electron/main.ts"),
          "chat-worker": resolve(__dirname, "electron/chat-worker.ts"),
        },
        // The HTML-processing libraries used by @llm-chatter/ai-runtime's
        // web-fetch / web-search builtin tools (jsdom, turndown,
        // @mozilla/readability) MUST stay external rather than bundled. They are
        // node-DOM libraries that rely on real file paths: jsdom's transitive
        // css-tree does createRequire(import.meta.url) + require('../data/patch.json'),
        // and turndown does require('@mixmark-io/domino') at module-eval time.
        // Once inlined into a CJS chunk these paths break and crash the main
        // process at startup. Keeping them external preserves the real file
        // layouts; they ship as runtime deps (see apps/desktop/package.json)
        // and resolve from node_modules at runtime.
        external: [
          /electron\/db\/generated/,
          "jsdom",
          "turndown",
          "@mozilla/readability",
        ],
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === "chat-worker") return "[name].cjs";
            return "[name].js";
          },
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist-electron/preload",
      rollupOptions: {
        input: { index: resolve(__dirname, "electron/preload.ts") },
      },
    },
  },
  renderer: undefined,
});