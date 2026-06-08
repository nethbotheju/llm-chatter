import { PrismaClient } from "@prisma/client";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { app } from "electron";

function getDataDir(): string {
  const dir = join(app.getPath("userData"), "llm-chatter");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

let prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    const dataDir = getDataDir();
    const dbPath = join(dataDir, "llm-chatter.db");
    const url = `file:${dbPath}`;

    prismaInstance = new PrismaClient({
      datasources: { db: { url } },
    });
  }
  return prismaInstance;
}
