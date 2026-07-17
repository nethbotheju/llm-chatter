import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { JSDOM } from "jsdom";

export type WebFetchFormat = "lean" | "markdown";

export interface WebFetchInput {
  url: string;
  format?: WebFetchFormat;
  maxLength?: number;
}

export interface WebFetchConfig {
  format?: WebFetchFormat;
  maxLength?: number;
  timeoutMs?: number;
  useJina?: boolean;
  jinaApiKey?: string;
}

export interface WebFetchResult {
  title: string;
  url: string;
  content: string;
  tier: "jina" | "local";
  format: WebFetchFormat;
  chars: number;
}

const MAX_BODY_BYTES = 10 << 20;
const JINA_BASE = "https://r.jina.ai/";
const FALLBACK_TIMEOUT_MS = 15000;
const DEFAULT_MAX_LENGTH = 10000;
const MAX_MAX_LENGTH = 50000;

function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const t = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, t]) : t;
}

function parseJina(raw: string): { title: string; content: string } {
  let title = "";
  let content = raw;
  const lines = raw.split("\n");
  let contentStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("Title:")) title = trimmed.slice("Title:".length).trim();
    if (trimmed === "Markdown Content:") contentStart = i + 1;
  }
  if (contentStart >= 0 && contentStart < lines.length) {
    content = lines.slice(contentStart).join("\n").trim();
  }
  return { title, content };
}

async function fetchViaJina(
  url: string,
  apiKey: string | undefined,
  format: WebFetchFormat,
  signal: AbortSignal | undefined,
): Promise<WebFetchResult> {
  const headers: Record<string, string> = { Accept: "text/plain" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  if (format === "lean") {
    headers["X-Retain-Links"] = "text";
    headers["X-Retain-Images"] = "none";
  }

  const resp = await fetch(`${JINA_BASE}${url}`, {
    headers,
    signal: withTimeout(signal, FALLBACK_TIMEOUT_MS),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Jina HTTP ${resp.status}: ${body.slice(0, 200)}`);
  }
  const text = await resp.text();
  const { title, content } = parseJina(text);
  if (!content.trim()) throw new Error("Jina returned empty content");
  return {
    title: title || safeHost(url),
    url,
    content,
    tier: "jina",
    format,
    chars: content.length,
  };
}

async function readBounded(resp: Response, signal: AbortSignal | undefined): Promise<string> {
  const reader = resp.body?.getReader();
  if (!reader) return "";
  let received = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    if (signal?.aborted) throw new Error("Aborted");
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_BODY_BYTES) {
      throw new Error(`Response body exceeded ${MAX_BODY_BYTES} bytes`);
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

const LEAN_REMOVE_SELECTOR =
  "nav, header, footer, aside, script, style, noscript, iframe, form, " +
  "[role=navigation], [role=banner], [role=contentinfo], [role=complementary], " +
  ".sidebar, .nav, .menu, .breadcrumb, .related, #related";

function cleanDomForLean(doc: Document): void {
  doc.querySelectorAll(LEAN_REMOVE_SELECTOR).forEach((n) => n.remove());
}

function installLeanRules(td: TurndownService): void {
  td.addRule("leanLinks", { filter: "a", replacement: (content) => content });
  td.addRule("dropImages", {
    filter: ["img", "picture"],
    replacement: (_content, node) => {
      const alt = (node as HTMLElement).getAttribute?.("alt")?.trim();
      return alt ? `[image: ${alt}]` : "";
    },
  });
}

function collapseWhitespace(md: string): string {
  return md
    .replace(/[^\S\r\n]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function extractMarkdown(
  html: string,
  url: string,
  format: WebFetchFormat,
): { title: string; content: string } {
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;
  if (format === "lean") cleanDomForLean(doc);

  const article = new Readability(doc).parse();
  const title = article?.title ?? doc.querySelector("title")?.textContent?.trim() ?? safeHost(url);
  const htmlBody = article?.content ?? doc.body?.innerHTML ?? "";

  const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
  if (format === "lean") installLeanRules(td);
  let markdown = td.turndown(htmlBody);
  if (format === "lean") markdown = collapseWhitespace(markdown);
  return { title, content: markdown.trim() };
}

async function fetchViaLocal(
  url: string,
  timeoutMs: number,
  format: WebFetchFormat,
  signal: AbortSignal | undefined,
): Promise<WebFetchResult> {
  const headers: Record<string, string> = {
    Accept: "text/html,application/xhtml+xml,text/plain",
    "User-Agent": "llm-chatter/1.0",
  };
  const resp = await fetch(url, {
    headers,
    signal: withTimeout(signal, timeoutMs),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status}: ${body.slice(0, 200)}`);
  }
  const body = await readBounded(resp, signal);
  const contentType = resp.headers.get("content-type") ?? "";

  let title: string;
  let content: string;
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    title = safeHost(url);
    content = body;
  } else {
    const out = extractMarkdown(body, url, format);
    title = out.title;
    content = out.content;
  }
  if (!content.trim()) throw new Error("Empty content extracted from page");
  return { title, url, content, tier: "local", format, chars: content.length };
}

function truncate(out: WebFetchResult, maxLength: number): WebFetchResult {
  if (out.content.length <= maxLength) return out;
  out.content = `${out.content.slice(0, maxLength)}\n\n[Content truncated at ${maxLength} characters]`;
  out.chars = out.content.length;
  return out;
}

export async function runWebFetch(
  input: WebFetchInput,
  cfg: WebFetchConfig,
  signal?: AbortSignal,
): Promise<WebFetchResult> {
  const { url } = input;
  const format: WebFetchFormat = input.format === "markdown" ? "markdown" : cfg.format ?? "lean";

  let parsed: URL | null;
  try {
    parsed = new URL(url);
  } catch {
    parsed = null;
  }
  if (!parsed || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
    throw new Error(`Unsupported URL (only http/https are supported): ${url}`);
  }

  const requested =
    input.maxLength && input.maxLength > 0
      ? input.maxLength
      : cfg.maxLength && cfg.maxLength > 0
        ? cfg.maxLength
        : DEFAULT_MAX_LENGTH;
  const maxLength = Math.min(requested, MAX_MAX_LENGTH);
  const errors: string[] = [];

  if (cfg.useJina) {
    try {
      return truncate(await fetchViaJina(url, cfg.jinaApiKey, format, signal), maxLength);
    } catch (err) {
      errors.push(`jina: ${(err as Error).message}`);
    }
  }

  try {
    return truncate(
      await fetchViaLocal(url, cfg.timeoutMs ?? FALLBACK_TIMEOUT_MS, format, signal),
      maxLength,
    );
  } catch (err) {
    errors.push(`local: ${(err as Error).message}`);
  }

  throw new Error(`All fetch tiers failed:\n  - ${errors.join("\n  - ")}`);
}
