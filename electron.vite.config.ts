import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist-electron/main",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "electron/main.ts"),
          "chat-worker": resolve(__dirname, "electron/chat-worker.ts"),
        },
        external: [/electron\/db\/generated/],
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