import type { BuiltinToolMeta } from "./types";
import type { BuiltinConfig } from "./types";
import { builtinCatalog } from "@llm-chatter/contracts";

export interface ConfigCipher {
  encrypt(plain: string): string;
  decrypt(cipher: string): string;
}

export const ENC_PREFIX = "enc:";
export const REDACTED = "__redacted__";

export function isEncrypted(value: unknown): boolean {
  return typeof value === "string" && value.startsWith(ENC_PREFIX);
}

function secretKeys(metas: BuiltinToolMeta[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const m of metas) {
    const keys = new Set<string>();
    for (const f of m.configFields) if (f.type === "secret") keys.add(f.key);
    map.set(m.id, keys);
  }
  return map;
}

const catalogSecrets = secretKeys(builtinCatalog);

export function encryptConfigSecrets(
  config: BuiltinConfig,
  cipher: ConfigCipher,
): BuiltinConfig {
  const configs: Record<string, Record<string, unknown>> = {};
  for (const [toolId, toolCfg] of Object.entries(config.configs)) {
    const secrets = catalogSecrets.get(toolId);
    const out: Record<string, unknown> = { ...toolCfg };
    if (secrets) {
      for (const key of secrets) {
        const v = out[key];
        if (typeof v === "string" && v !== REDACTED && !isEncrypted(v) && v.length > 0) {
          out[key] = ENC_PREFIX + cipher.encrypt(v);
        }
      }
    }
    configs[toolId] = out;
  }
  return { enabled: config.enabled, configs };
}

export function decryptConfigSecrets(
  config: BuiltinConfig,
  cipher: ConfigCipher,
): BuiltinConfig {
  const configs: Record<string, Record<string, unknown>> = {};
  for (const [toolId, toolCfg] of Object.entries(config.configs)) {
    const out: Record<string, unknown> = { ...toolCfg };
    for (const [key, v] of Object.entries(toolCfg)) {
      if (typeof v === "string" && v.startsWith(ENC_PREFIX)) {
        out[key] = cipher.decrypt(v.slice(ENC_PREFIX.length));
      }
    }
    configs[toolId] = out;
  }
  return { enabled: config.enabled, configs };
}

export function redactConfigSecrets(config: BuiltinConfig): BuiltinConfig {
  const configs: Record<string, Record<string, unknown>> = {};
  for (const [toolId, toolCfg] of Object.entries(config.configs)) {
    const secrets = catalogSecrets.get(toolId);
    const out: Record<string, unknown> = { ...toolCfg };
    if (secrets) {
      for (const key of secrets) {
        if (isEncrypted(out[key])) out[key] = REDACTED;
      }
    }
    configs[toolId] = out;
  }
  return { enabled: config.enabled, configs };
}

// ── Generic map-level secret helpers (env / headers) ──

type StringMap = Record<string, string>;

export function encryptSecretMap(
  map: StringMap,
  secretKeys: Set<string>,
  cipher: ConfigCipher,
): StringMap {
  const out: StringMap = { ...map };
  for (const key of secretKeys) {
    const v = out[key];
    if (typeof v === "string" && v !== REDACTED && !isEncrypted(v) && v.length > 0) {
      out[key] = ENC_PREFIX + cipher.encrypt(v);
    }
  }
  return out;
}

export function decryptSecretMap(map: StringMap, cipher: ConfigCipher): StringMap {
  const out: StringMap = { ...map };
  for (const key of Object.keys(out)) {
    if (isEncrypted(out[key])) {
      out[key] = cipher.decrypt(out[key].slice(ENC_PREFIX.length));
    }
  }
  return out;
}

export function redactSecretMap(map: StringMap, secretKeys: Set<string>): StringMap {
  const out: StringMap = { ...map };
  for (const key of secretKeys) {
    if (isEncrypted(out[key])) out[key] = REDACTED;
  }
  return out;
}

export function mergeSecretMap(
  existing: StringMap,
  incoming: StringMap,
  secretKeys: Set<string>,
): StringMap {
  const out: StringMap = { ...incoming };
  for (const key of secretKeys) {
    const v = out[key];
    if (v === REDACTED) {
      if (existing[key] !== undefined) out[key] = existing[key];
      else delete out[key];
    } else if (typeof v === "string" && v.length === 0) {
      delete out[key];
    }
  }
  return out;
}

export interface McpSecretConfig {
  envSecretKeys: string[];
  headersSecretKeys: string[];
}

export const EMPTY_MCP_SECRET_CONFIG: McpSecretConfig = {
  envSecretKeys: [],
  headersSecretKeys: [],
};

export function parseMcpSecretConfig(
  raw: string | null | undefined,
): McpSecretConfig {
  if (!raw) return { ...EMPTY_MCP_SECRET_CONFIG };
  try {
    const parsed = JSON.parse(raw) as Partial<McpSecretConfig>;
    return {
      envSecretKeys: Array.isArray(parsed?.envSecretKeys)
        ? parsed.envSecretKeys.filter((x): x is string => typeof x === "string")
        : [],
      headersSecretKeys: Array.isArray(parsed?.headersSecretKeys)
        ? parsed.headersSecretKeys.filter((x): x is string => typeof x === "string")
        : [],
    };
  } catch {
    return { ...EMPTY_MCP_SECRET_CONFIG };
  }
}

export function mergeClientConfig(
  existing: BuiltinConfig,
  incoming: BuiltinConfig,
): BuiltinConfig {
  const configs: Record<string, Record<string, unknown>> = {};
  for (const [toolId, incomingCfg] of Object.entries(incoming.configs)) {
    const secrets = catalogSecrets.get(toolId);
    const existingCfg = existing.configs[toolId] ?? {};
    const out: Record<string, unknown> = { ...incomingCfg };
    if (secrets) {
      for (const key of secrets) {
        const v = out[key];
        if (v === REDACTED) {
          if (existingCfg[key] !== undefined) out[key] = existingCfg[key];
          else delete out[key];
        } else if (typeof v === "string" && v.length === 0) {
          delete out[key];
        }
      }
    }
    configs[toolId] = out;
  }
  return { enabled: incoming.enabled, configs };
}
