import type { NextConfig } from "next";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from the workspace root .env file
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["better-sqlite3"],
  transpilePackages: ["@llm-chatter/frontend"],
};

export default nextConfig;
