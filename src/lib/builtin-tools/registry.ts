import type { Tool } from "ai";
import type { BuiltinToolDefinition } from "./types";
import { webSearchTool } from "./tools/web-search";
import { webFetchTool } from "./tools/web-fetch";

export const builtinToolDefinitions: BuiltinToolDefinition[] = [webSearchTool, webFetchTool];

export function getBuiltinTools(opts: {
  enabled: string[];
  configs: Record<string, Record<string, unknown>>;
}): Record<string, Tool> {
  const out: Record<string, Tool> = {};
  for (const def of builtinToolDefinitions) {
    if (!opts.enabled.includes(def.id)) continue;
    const cfg = { ...def.defaultConfig, ...(opts.configs[def.id] ?? {}) };
    out[def.id] = def.createTool(cfg);
  }
  return out;
}
