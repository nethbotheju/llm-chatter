import type { BuiltinToolMeta } from "../index";
import { webSearchConfig } from "./tools/web-search/config";
import { webFetchConfig } from "./tools/web-fetch/config";

export const builtinCatalog: BuiltinToolMeta[] = [webSearchConfig, webFetchConfig];

export function getBuiltinCatalog(): BuiltinToolMeta[] {
  return builtinCatalog;
}

export function getBuiltinToolMeta(id: string): BuiltinToolMeta | undefined {
  return builtinCatalog.find((t) => t.id === id);
}
