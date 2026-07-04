export interface ToolInvocationPart {
  type: string;
  toolCallId?: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

export type ToolKind = "web_search" | "web_fetch" | "mcp" | "generic";

export interface ToolMeta {
  kind: ToolKind;
  name: string;
  server?: string;
}

export function resolveToolMeta(part: ToolInvocationPart): ToolMeta {
  const raw =
    part.toolName ??
    (part.type.startsWith("tool-") ? part.type.slice("tool-".length) : part.type);
  if (raw === "web_search") return { kind: "web_search", name: raw };
  if (raw === "web_fetch") return { kind: "web_fetch", name: raw };
  const sep = raw.indexOf("__");
  if (sep > 0) {
    return { kind: "mcp", name: raw.slice(sep + 2), server: raw.slice(0, sep) };
  }
  return { kind: "generic", name: raw };
}

export type InputShape = "empty" | "object" | "scalar";

export function classifyInput(input: unknown): InputShape {
  if (input == null) return "empty";
  if (typeof input === "string") return input.trim() === "" ? "empty" : "scalar";
  if (typeof input === "number" || typeof input === "boolean") return "scalar";
  if (Array.isArray(input)) return input.length === 0 ? "empty" : "scalar";
  if (typeof input === "object") {
    return Object.keys(input).length === 0 ? "empty" : "object";
  }
  return "scalar";
}

export function getField(obj: unknown, key: string): unknown {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    return (obj as Record<string, unknown>)[key];
  }
  return undefined;
}

export function getHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export function faviconUrl(host: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`;
}

export function formatScalar(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function formatResultText(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function extractMcpResult(
  output: unknown,
): { isError: boolean; text: string | null } | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const obj = output as Record<string, unknown>;
  if (!Array.isArray(obj.content)) return null;
  const texts: string[] = [];
  for (const block of obj.content) {
    if (
      block &&
      typeof block === "object" &&
      (block as Record<string, unknown>).type === "text" &&
      typeof (block as Record<string, unknown>).text === "string"
    ) {
      texts.push((block as Record<string, unknown>).text as string);
    }
  }
  return {
    isError: obj.isError === true,
    text: texts.length > 0 ? texts.join("\n\n") : null,
  };
}

export interface TriggerLabel {
  text: string;
  failed: boolean;
}

export function buildTriggerLabel(
  meta: ToolMeta,
  state: string,
  part: ToolInvocationPart,
): TriggerLabel {
  const failed = state === "output-error";
  const running = state !== "output-available" && state !== "output-error";

  if (meta.kind === "web_search") {
    if (failed) return { text: "Searched the web — failed", failed: true };
    if (running) return { text: "Searching the web…", failed: false };
    const explicitCount = getField(part.output, "count");
    const sources = getField(part.output, "sources");
    const count =
      typeof explicitCount === "number"
        ? explicitCount
        : Array.isArray(sources)
          ? sources.length
          : null;
    return {
      text: count ? `Searched the web · ${count} results` : "Searched the web",
      failed: false,
    };
  }

  if (meta.kind === "web_fetch") {
    const url = getField(part.input, "url") ?? getField(part.output, "url");
    const host = typeof url === "string" ? getHost(url) : null;
    const where = host ?? "page";
    if (failed) return { text: `Read ${where} — failed`, failed: true };
    if (running) return { text: `Reading ${where}…`, failed: false };
    return { text: `Read ${where}`, failed: false };
  }

  const via = meta.server ? ` · via ${meta.server}` : "";
  const mcpError =
    meta.kind === "mcp" && extractMcpResult(part.output)?.isError === true;
  if (failed || mcpError) return { text: `Ran ${meta.name} — failed`, failed: true };
  if (running) return { text: `Running ${meta.name}…`, failed: false };
  return { text: `Ran ${meta.name}${via}`, failed: false };
}
