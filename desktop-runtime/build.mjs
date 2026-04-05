import { build } from "esbuild";

await build({
  entryPoints: ["desktop-runtime/src/server.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  outfile: "desktop-runtime/dist/server.cjs",
  external: [],
  sourcemap: false,
  minify: false,
});
