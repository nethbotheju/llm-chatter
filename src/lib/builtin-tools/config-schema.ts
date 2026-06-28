import type { BuiltinToolMeta, ConfigField, BuiltinConfig } from "./types";
import { EMPTY_BUILTIN_CONFIG } from "./types";
import { builtinCatalog } from "./catalog";

export function buildDefaultConfigs(
  metas: BuiltinToolMeta[] = builtinCatalog,
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const m of metas) out[m.id] = { ...m.defaultConfig };
  return out;
}

export function fieldVisible(
  field: ConfigField,
  values: Record<string, unknown>,
): boolean {
  if (!field.showWhen) return true;
  return values[field.showWhen.field] === field.showWhen.equals;
}

export function normalizeConfig(
  meta: BuiltinToolMeta,
  raw: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...meta.defaultConfig };
  if (!raw) return out;
  for (const field of meta.configFields) {
    if (raw[field.key] !== undefined) out[field.key] = raw[field.key];
  }
  return out;
}

export function parseBuiltinConfig(
  raw: string | null | undefined,
): BuiltinConfig {
  if (!raw) return { ...EMPTY_BUILTIN_CONFIG };
  try {
    const parsed = JSON.parse(raw) as Partial<BuiltinConfig>;
    return {
      enabled: Array.isArray(parsed?.enabled)
        ? parsed.enabled.filter((x): x is string => typeof x === "string")
        : [],
      configs:
        parsed?.configs && typeof parsed.configs === "object"
          ? (parsed.configs as Record<string, Record<string, unknown>>)
          : {},
    };
  } catch {
    return { ...EMPTY_BUILTIN_CONFIG };
  }
}
