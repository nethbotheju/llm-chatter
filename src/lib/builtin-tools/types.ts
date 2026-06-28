import type { Tool } from "ai";

export type ConfigFieldType = "text" | "number" | "boolean" | "select" | "secret";

export interface SelectOption {
  label: string;
  value: string;
}

export interface ConfigField {
  key: string;
  label: string;
  description?: string;
  type: ConfigFieldType;
  options?: SelectOption[];
  default: unknown;
  placeholder?: string;
  showWhen?: { field: string; equals: unknown };
}

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
