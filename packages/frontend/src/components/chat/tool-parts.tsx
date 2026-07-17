"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";
import { MemoizedMarkdown } from "../markdown/memoized-markdown";
import {
  classifyInput,
  extractMcpResult,
  faviconUrl,
  formatResultText,
  formatScalar,
  getField,
  getHost,
  type ToolKind,
} from "./tool-helpers";

interface ToolDisclosureProps {
  open: boolean;
  onToggle: () => void;
  header: React.ReactNode;
  children: React.ReactNode;
}

export function ToolDisclosure({ open, onToggle, header, children }: ToolDisclosureProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            open && "rotate-90",
          )}
        />
        {header}
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-2 border-l border-[var(--outline-variant)]/15 pl-3 text-sm leading-relaxed text-[var(--on-surface-variant)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResultView({ value, tone }: { value: unknown; tone?: "error" }) {
  if (value == null || value === "") return null;
  return (
    <pre
      className={cn(
        "max-h-64 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--on-surface-variant)] custom-scrollbar",
        tone === "error" && "text-[var(--destructive)]",
      )}
    >
      {formatResultText(value)}
    </pre>
  );
}

interface Source {
  title?: string;
  url?: string;
  description?: string;
}

function SourceRow({ title, url, description }: Source) {
  const host = url ? getHost(url) : null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 rounded-md py-1 transition-colors hover:bg-[var(--surface-container-high)]/40"
    >
      {host && (
        <img
          src={faviconUrl(host)}
          alt=""
          className="mt-0.5 h-4 w-4 shrink-0 rounded-sm"
          loading="lazy"
        />
      )}
      <div className="min-w-0">
        <div className="truncate text-[var(--on-surface)] hover:underline">{title}</div>
        <div className="truncate text-[11px] text-[var(--on-surface-variant)]/70">
          {host}
          {description ? ` · ${description}` : ""}
        </div>
      </div>
    </a>
  );
}

export function WebSearchContent({ input, output }: { input?: unknown; output?: unknown }) {
  const query = getField(input, "query");
  const sources = getField(output, "sources");

  return (
    <div className="space-y-1.5">
      {typeof query === "string" && query && (
        <p className="text-xs italic text-[var(--on-surface-variant)]/70">&ldquo;{query}&rdquo;</p>
      )}
      {Array.isArray(sources) && sources.length > 0 ? (
        sources.map((s, i) => {
          const src = s as Source;
          if (!src.url || !src.title) return null;
          return (
            <SourceRow
              key={i}
              title={src.title}
              url={src.url}
              description={src.description}
            />
          );
        })
      ) : output != null ? (
        <ResultView value={getField(output, "results") ?? output} />
      ) : (
        <p className="text-xs text-[var(--on-surface-variant)]/60 animate-pulse">Searching…</p>
      )}
    </div>
  );
}

export function WebFetchContent({ input, output }: { input?: unknown; output?: unknown }) {
  const url = (getField(input, "url") ?? getField(output, "url")) as string | undefined;
  const title = getField(output, "title") as string | undefined;
  const content = getField(output, "content") as string | undefined;
  const chars = getField(output, "chars");
  const format = getField(output, "format");
  const host = url ? getHost(url) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        {host && (
          <img
            src={faviconUrl(host)}
            alt=""
            className="mt-0.5 h-4 w-4 shrink-0 rounded-sm"
            loading="lazy"
          />
        )}
        <div className="min-w-0">
          <div className="truncate text-[var(--on-surface)]">{title ?? host ?? url}</div>
          <div className="truncate text-[11px] text-[var(--on-surface-variant)]/70">
            {host ?? url}
            {typeof chars === "number" ? ` · ${chars} chars` : ""}
            {typeof format === "string" ? ` · ${format}` : ""}
          </div>
        </div>
      </div>
      {content ? (
        <div className="custom-scrollbar max-h-72 overflow-y-auto rounded-md bg-[var(--surface-container-low)]/40 p-2">
          <MemoizedMarkdown content={content} compact />
        </div>
      ) : (
        <p className="text-xs text-[var(--on-surface-variant)]/60 animate-pulse">Reading…</p>
      )}
    </div>
  );
}

function KeyValues({ value }: { value: Record<string, unknown> }) {
  return (
    <div className="space-y-0.5">
      {Object.entries(value).map(([k, v]) => (
        <div key={k} className="flex gap-1.5 text-xs">
          <span className="shrink-0 text-[var(--on-surface-variant)]/70">{k}:</span>
          <span className="min-w-0 truncate text-[var(--on-surface-variant)]">
            {formatScalar(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function GenericContent({
  input,
  output,
  kind,
}: {
  input?: unknown;
  output?: unknown;
  kind?: ToolKind;
}) {
  const shape = classifyInput(input);
  const mcp = kind === "mcp" ? extractMcpResult(output) : null;
  const effectiveOutput = mcp?.text != null ? mcp.text : output;
  const outputError = mcp?.isError === true;

  return (
    <div className="space-y-2">
      {shape === "object" && typeof input === "object" && input !== null ? (
        <KeyValues value={input as Record<string, unknown>} />
      ) : null}
      {shape === "scalar" && (
        <div>
          <p className="mb-1 text-[11px] font-medium text-[var(--on-surface-variant)]/70">
            Input
          </p>
          <ResultView value={input} />
        </div>
      )}
      {effectiveOutput != null && (
        <div>
          {shape !== "empty" && !outputError && (
            <p className="mb-1 text-[11px] font-medium text-[var(--on-surface-variant)]/70">
              Result
            </p>
          )}
          <ResultView value={effectiveOutput} tone={outputError ? "error" : undefined} />
        </div>
      )}
    </div>
  );
}
