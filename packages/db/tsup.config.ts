import { defineConfig } from "tsup";
import { cpSync, existsSync } from "node:fs";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  async onSuccess() {
    if (existsSync("migrations")) {
      cpSync("migrations", "dist/migrations", { recursive: true });
    }
  },
});
