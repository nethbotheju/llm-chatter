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
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === "chat-worker") return "[name].mjs";
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
  // Renderer is NOT bundled by electron-vite — Next.js handles the renderer.
  // electron-vite only compiles the main + preload processes.
  renderer: undefined,
});
