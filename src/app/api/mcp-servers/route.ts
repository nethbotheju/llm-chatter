import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { encrypt, decrypt } from "@/lib/ai/encryption";
import {
  parseBuiltinConfig,
  redactConfigSecrets,
  mergeClientConfig,
  encryptConfigSecrets,
  type ConfigCipher,
} from "@/lib/builtin-tools";
import type { BuiltinConfig } from "@/lib/builtin-tools";
import type { McpServerDTO } from "@/lib/contracts";

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

export async function GET() {
  const rows = await prisma.mcpServer.findMany({ orderBy: [{ isBuiltin: "desc" }, { createdAt: "asc" }] });
  return Response.json(rows.map(toDTO));
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, enabled, config } = body as {
      id: string;
      name?: string;
      enabled?: boolean;
      config?: BuiltinConfig;
    };

    if (!id) {
      return new Response(JSON.stringify({ error: "ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const existing = await prisma.mcpServer.findUnique({ where: { id } });
    if (!existing) {
      return new Response(JSON.stringify({ error: "MCP server not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

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
    return Response.json(toDTO(updated));
  } catch (error) {
    console.error("MCP server update error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update MCP server" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
