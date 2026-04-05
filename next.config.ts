import type { NextConfig } from "next";

const isDesktop = process.env.BUILD_TARGET === "desktop";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isDesktop && {
    output: "export",
    images: {
      unoptimized: true,
    },
  }),
};

export default nextConfig;
