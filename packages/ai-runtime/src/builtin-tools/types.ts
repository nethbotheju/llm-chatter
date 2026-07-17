import type { Tool } from "ai";
import type { ConfigField, ConfigFieldType, SelectOption } from "@llm-chatter/contracts";

export type { ConfigField, ConfigFieldType, SelectOption };

export interface BuiltinToolMeta {
  id: string;
  name: string;
  description: string;
  configFields: ConfigField[];
  defaultConfig: Record<string, unknown>;
}

export interface BuiltinToolDefinition extends BuiltinToolMeta {
  createTool(config: Record<string, unknown>): Tool;
}

export interface BuiltinConfig {
  enabled: string[];
  configs: Record<string, Record<string, unknown>>;
}

export const EMPTY_BUILTIN_CONFIG: BuiltinConfig = { enabled: [], configs: {} };
