import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default [
  ...nextCoreWebVitals,
  {
    ignores: [
      ".next/**",
      "out/**",
      "dist-electron/**",
      "release/**",
      "node_modules/**",
      "next-env.d.ts",
      "prisma/migrations/**",
      "desktop-runtime/dist/**",
      "src-tauri/target/**",
      "src-tauri/gen/**",
      ".claude/**",
      "plans/**",
      "scripts/**",
    ],
  },
];
