import {
  encryptSecretMap,
  decryptSecretMap,
  redactSecretMap,
  mergeSecretMap,
  parseMcpSecretConfig,
  parseBuiltinConfig,
  redactConfigSecrets,
  mergeClientConfig,
  encryptConfigSecrets,
  decryptConfigSecrets,
  type ConfigCipher,
  type McpSecretConfig,
  type BuiltinConfig,
} from "../builtin-tools";
import type { McpServerDTO } from "../contracts";
import type {
  CreateMcpServerInputDTO as CreateMcpServerInput,
  UpdateMcpServerInputDTO as UpdateMcpServerInput,
} from "../contracts";
import type { ResolvedToolSource } from "../chat-runtime";

export interface McpServerRow {
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
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface McpServerCreateData {
  name: string;
  slug: string;
  transport: string;
  command: string | null;
  args: string | null;
  env: string | null;
  url: string | null;
  headers: string | null;
  config: string;
  enabled: boolean;
  isBuiltin: boolean;
}

export interface McpServerUpdateData {
  name?: string;
  enabled?: boolean;
  config?: string;
  command?: string | null;
  args?: string | null;
  env?: string | null;
  url?: string | null;
  headers?: string | null;
}

function parseJsonField<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "mcp"
  );
}

export function validateUserTransport(input: {
  transport: string;
  command?: string;
  url?: string;
}): string | null {
  if (input.transport === "stdio") {
    if (!input.command?.trim()) return "stdio transport requires a command";
  } else if (input.transport === "http" || input.transport === "sse") {
    if (!input.url?.trim()) return `${input.transport} transport requires a URL`;
  } else {
    return `Unsupported transport: ${input.transport}`;
  }
  return null;
}

function secretConfigFromInput(input: {
  envSecretKeys?: string[];
  headersSecretKeys?: string[];
}): McpSecretConfig {
  return {
    envSecretKeys: input.envSecretKeys ?? [],
    headersSecretKeys: input.headersSecretKeys ?? [],
  };
}

export function buildCreateData(
  input: CreateMcpServerInput,
  baseSlug: string,
  cipher: ConfigCipher,
): McpServerCreateData {
  const secretConfig = secretConfigFromInput(input);
  const env = encryptSecretMap(
    input.env ?? {},
    new Set(secretConfig.envSecretKeys),
    cipher,
  );
  const headers = encryptSecretMap(
    input.headers ?? {},
    new Set(secretConfig.headersSecretKeys),
    cipher,
  );

  return {
    name: input.name,
    slug: baseSlug,
    transport: input.transport,
    command: input.command ?? null,
    args: input.args ? JSON.stringify(input.args) : null,
    env: Object.keys(env).length ? JSON.stringify(env) : null,
    url: input.url ?? null,
    headers: Object.keys(headers).length ? JSON.stringify(headers) : null,
    config: JSON.stringify(secretConfig),
    enabled: input.enabled ?? true,
    isBuiltin: false,
  };
}

export function buildUpdateData(
  existing: McpServerRow,
  input: UpdateMcpServerInput,
  cipher: ConfigCipher,
): McpServerUpdateData {
  const data: McpServerUpdateData = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.enabled !== undefined) data.enabled = input.enabled;

  if (existing.transport === "builtin") {
    if (input.config !== undefined) {
      const existingConfig = parseBuiltinConfig(existing.config);
      const merged = mergeClientConfig(
        existingConfig,
        input.config as BuiltinConfig,
      );
      data.config = JSON.stringify(encryptConfigSecrets(merged, cipher));
    }
    return data;
  }

  const existingSecretConfig = parseMcpSecretConfig(existing.config);
  const secretConfig = secretConfigFromInput({
    envSecretKeys: input.envSecretKeys ?? existingSecretConfig.envSecretKeys,
    headersSecretKeys:
      input.headersSecretKeys ?? existingSecretConfig.headersSecretKeys,
  });
  data.config = JSON.stringify(secretConfig);

  if (input.command !== undefined) data.command = input.command || null;
  if (input.args !== undefined)
    data.args = input.args?.length ? JSON.stringify(input.args) : null;

  if (input.env !== undefined) {
    const existingEnv = parseJsonField<Record<string, string>>(existing.env) ?? {};
    const merged = mergeSecretMap(
      existingEnv,
      input.env,
      new Set(secretConfig.envSecretKeys),
    );
    data.env = Object.keys(merged).length ? JSON.stringify(merged) : null;
  }

  if (input.url !== undefined) data.url = input.url || null;

  if (input.headers !== undefined) {
    const existingHeaders =
      parseJsonField<Record<string, string>>(existing.headers) ?? {};
    const merged = mergeSecretMap(
      existingHeaders,
      input.headers,
      new Set(secretConfig.headersSecretKeys),
    );
    data.headers = Object.keys(merged).length ? JSON.stringify(merged) : null;
  }

  return data;
}

export function toMcpServerDTO(row: McpServerRow): McpServerDTO {
  let config: unknown = null;
  if (row.transport === "builtin") {
    config = redactConfigSecrets(parseBuiltinConfig(row.config));
  } else {
    const secretConfig = parseMcpSecretConfig(row.config);
    config = secretConfig;
  }

  let env = parseJsonField<Record<string, string>>(row.env);
  let headers = parseJsonField<Record<string, string>>(row.headers);
  if (env && row.transport !== "builtin") {
    env = redactSecretMap(env, new Set(parseMcpSecretConfig(row.config).envSecretKeys));
  }
  if (headers && row.transport !== "builtin") {
    headers = redactSecretMap(
      headers,
      new Set(parseMcpSecretConfig(row.config).headersSecretKeys),
    );
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    transport: row.transport as McpServerDTO["transport"],
    command: row.command,
    args: parseJsonField<string[]>(row.args),
    env,
    url: row.url,
    headers,
    config,
    enabled: row.enabled,
    isBuiltin: row.isBuiltin,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : row.updatedAt.toISOString(),
  };
}

export function toResolvedToolSource(
  row: McpServerRow,
  cipher: ConfigCipher,
): ResolvedToolSource {
  const base: ResolvedToolSource = {
    id: row.id,
    slug: row.slug,
    transport: row.transport as ResolvedToolSource["transport"],
    enabled: row.enabled,
    isBuiltin: row.isBuiltin,
  };

  if (row.transport === "builtin") {
    return {
      ...base,
      builtinConfig: decryptConfigSecrets(
        parseBuiltinConfig(row.config),
        cipher,
      ),
    };
  }

  const envRaw = parseJsonField<Record<string, string>>(row.env);
  const headersRaw = parseJsonField<Record<string, string>>(row.headers);
  return {
    ...base,
    command: row.command ?? undefined,
    args: parseJsonField<string[]>(row.args) ?? undefined,
    env: envRaw ? decryptSecretMap(envRaw, cipher) : undefined,
    url: row.url ?? undefined,
    headers: headersRaw ? decryptSecretMap(headersRaw, cipher) : undefined,
  };
}
