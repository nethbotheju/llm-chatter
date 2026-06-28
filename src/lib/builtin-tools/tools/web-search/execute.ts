import { JSDOM } from "jsdom";

export interface SearchResult {
  title: string;
  url: string;
  description?: string;
}

export interface WebSearchInput {
  query: string;
  count?: number;
}

export interface WebSearchConfig {
  provider?: string;
  searxngUrl?: string;
  searxngApiKey?: string;
  maxResults?: number;
  safeSearch?: boolean;
}

const DEFAULT_COUNT = 5;
const MAX_COUNT = 10;
const REQUEST_TIMEOUT_MS = 30000;

function clampCount(n: number | undefined): number {
  if (!n || n <= 0) return DEFAULT_COUNT;
  return Math.min(Math.max(Math.floor(n), 1), MAX_COUNT);
}

function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const t = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, t]) : t;
}

function decodeDdgHref(href: string): string {
  try {
    let h = href;
    if (h.startsWith("//")) h = "https:" + h;
    const u = new URL(h, "https://duckduckgo.com");
    const uddg = u.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
  } catch {
    return "";
  }
  return "";
}

function parseDuckDuckGoHtml(html: string, count: number): SearchResult[] {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const results: SearchResult[] = [];
  doc.querySelectorAll("a.result__a").forEach((a) => {
    if (results.length >= count) return;
    const url = decodeDdgHref(a.getAttribute("href") ?? "");
    const title = (a.textContent ?? "").trim();
    if (!url || !title) return;
    const wrap = a.closest(".result, .web-result");
    const snip = wrap?.querySelector(".result__snippet");
    const description = snip ? (snip.textContent ?? "").trim() || undefined : undefined;
    results.push({ title, url, description });
  });
  return results;
}

async function searchDuckDuckGo(
  query: string,
  count: number,
  safeSearch: boolean,
  signal: AbortSignal | undefined,
): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query });
  params.set("kp", safeSearch ? "1" : "-2");
  const url = `https://html.duckduckgo.com/html/?${params.toString()}`;

  const resp = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (compatible; llm-chatter/1.0)",
    },
    signal: withTimeout(signal, REQUEST_TIMEOUT_MS),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`DuckDuckGo HTTP ${resp.status}: ${body.slice(0, 200)}`);
  }
  return parseDuckDuckGoHtml(await resp.text(), count);
}

interface SearXNGRow {
  url?: string;
  title?: string;
  content?: string;
}

async function searchSearxng(
  query: string,
  baseUrl: string,
  apiKey: string | undefined,
  count: number,
  signal: AbortSignal | undefined,
): Promise<SearchResult[]> {
  const base = baseUrl.replace(/\/+$/, "");
  const params = new URLSearchParams({ q: query, format: "json", pageno: "1" });
  const url = `${base}/search?${params.toString()}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "llm-chatter/1.0",
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const resp = await fetch(url, {
    headers,
    signal: withTimeout(signal, REQUEST_TIMEOUT_MS),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`SearXNG HTTP ${resp.status}: ${body.slice(0, 200)}`);
  }
  const data = (await resp.json()) as { results?: SearXNGRow[] };
  const rows = Array.isArray(data?.results) ? data.results : [];

  const results: SearchResult[] = [];
  for (const row of rows) {
    if (results.length >= count) break;
    const u = (row.url ?? "").trim();
    const t = (row.title ?? "").trim();
    if (!u || !t) continue;
    results.push({
      title: t,
      url: u,
      description: row.content?.trim() || undefined,
    });
  }
  return results;
}

export async function runWebSearch(
  input: WebSearchInput,
  cfg: WebSearchConfig,
  signal?: AbortSignal,
): Promise<{ results: SearchResult[]; provider: string }> {
  const count = clampCount(input.count ?? cfg.maxResults);
  const provider = cfg.provider ?? "duckduckgo";

  if (provider === "searxng") {
    if (!cfg.searxngUrl?.trim()) {
      throw new Error("SearXNG instance URL is not configured");
    }
    const results = await searchSearxng(
      input.query,
      cfg.searxngUrl!.trim(),
      cfg.searxngApiKey,
      count,
      signal,
    );
    return { results, provider: "SearXNG" };
  }

  const results = await searchDuckDuckGo(
    input.query,
    count,
    cfg.safeSearch ?? true,
    signal,
  );
  return { results, provider: "DuckDuckGo" };
}

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) return "No search results found.";
  let out = "";
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    out += `${i + 1}. ${r.title}\n   ${r.url}`;
    if (r.description) out += `\n   ${r.description}`;
    out += "\n\n";
  }
  return out.trimEnd();
}
