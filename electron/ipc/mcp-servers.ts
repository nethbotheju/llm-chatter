import { ipcMain } from "electron";
import { getPrisma } from "../db/client";
import { encrypt, decrypt } from "../db/encryption";
import {
  parseBuiltinConfig,
  redactConfigSecrets,
  mergeClientConfig,
  encryptConfigSecrets,
  type ConfigCipher,
} from "../../src/lib/builtin-tools";
import type { BuiltinConfig } from "../../src/lib/builtin-tools";
import type { McpServerDTO } from "../../src/lib/contracts";

const cipher: ConfigCipher = { encrypt, decrypt };

function parseJsonField<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function toDTO(row: {
  id: string;
  name: string;
  slug: string;
  transport: string;
  command: string | null;
  args: string | null;
  env: string | null;
  url: string | null;
  headers: string | null;
  config: string | null;
  enabled: boolean;
  isBuiltin: boolean;
  createdAt: Date;
  updatedAt: Date;
}): McpServerDTO {
  const config = redactConfigSecrets(parseBuiltinConfig(row.config));
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    transport: row.transport as McpServerDTO["transport"],
    command: row.command,
    args: parseJsonField<string[]>(row.args),
    env: parseJsonField<Record<string, string>>(row.env),
    url: row.url,
    headers: parseJsonField<Record<string, string>>(row.headers),
    config: row.transport === "builtin" ? config : null,
    enabled: row.enabled,
    isBuiltin: row.isBuiltin,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function registerMcpServersIpc() {
  ipcMain.handle("mcpServers:getAll", async () => {
    const prisma = getPrisma();
    const rows = await prisma.mcpServer.findMany({
      orderBy: [{ isBuiltin: "desc" }, { createdAt: "asc" }],
    });
    return rows.map(toDTO);
  });

  ipcMain.handle("mcpServers:update", async (_e, input: {
    id: string;
    name?: string;
    enabled?: boolean;
    config?: BuiltinConfig;
  }) => {
    const prisma = getPrisma();
    const { id, name, enabled, config } = input;

    const existing = await prisma.mcpServer.findUnique({ where: { id } });
    if (!existing) throw new Error("MCP server not found");

    const data: { name?: string; enabled?: boolean; config?: string } = {};
    if (name !== undefined) data.name = name;
    if (enabled !== undefined) data.enabled = enabled;

    if (config !== undefined && existing.transport === "builtin") {
      const existingConfig = parseBuiltinConfig(existing.config);
      const merged = mergeClientConfig(existingConfig, config);
      const encrypted = encryptConfigSecrets(merged, cipher);
      data.config = JSON.stringify(encrypted);
    }

    const updated = await prisma.mcpServer.update({ where: { id }, data });
    return toDTO(updated);
  });
}
