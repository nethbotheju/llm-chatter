"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Wrench, Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolInvocationPart {
  type: string;
  toolCallId?: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

interface ToolInvocationBlockProps {
  part: ToolInvocationPart;
}

function toolName(part: ToolInvocationPart): string {
  if (part.toolName) return part.toolName;
  if (part.type.startsWith("tool-")) return part.type.slice("tool-".length);
  return "tool";
}

function summarize(value: unknown, max = 240): string {
  let text: string;
  if (typeof value === "string") {
    text = value;
  } else {
    try {
      text = JSON.stringify(value, null, 2);
    } catch {
      text = String(value);
    }
  }
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function ToolInvocationBlock({ part }: ToolInvocationBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const name = toolName(part);
  const state = part.state ?? "input-available";

  const isStreaming = state === "input-streaming";
  const isError = state === "output-error";

  const inputObj =
    part.input && typeof part.input === "object"
      ? (part.input as Record<string, unknown>)
      : null;
  const inputHint = inputObj
    ? inputObj.query
      ? String(inputObj.query)
      : inputObj.url
        ? String(inputObj.url)
        : undefined
    : undefined;

  return (
    <div className="rounded-xl border border-[var(--outline-variant)]/15 bg-[var(--surface-container-low)]/60">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-container-high)]/40"
      >
        <Wrench className="h-3.5 w-3.5 shrink-0 text-[var(--on-surface-variant)]" />
        <span className="text-xs font-bold tracking-tight text-[var(--on-surface)]">{name}</span>

        {isStreaming && <Loader2 className="h-3 w-3 animate-spin text-[var(--on-surface-variant)]" />}
        {state === "output-available" && (
          <Check className="h-3 w-3 text-green-500" />
        )}
        {isError && <AlertCircle className="h-3 w-3 text-[var(--destructive)]" />}

        {inputHint && (
          <span className="truncate text-[11px] text-[var(--on-surface-variant)] opacity-70">
            {inputObj?.url ? inputHint : `“${inputHint}”`}
          </span>
        )}

        <span className="ml-auto shrink-0 text-[var(--on-surface-variant)]">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-[var(--outline-variant)]/10 px-3 py-2">
          {part.input != null && (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-50">
                Input
              </p>
              <pre className={cn("overflow-auto text-[11px] leading-relaxed text-[var(--on-surface-variant)]")}>
                {summarize(part.input)}
              </pre>
            </div>
          )}
          {isError && part.errorText && (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--destructive)] opacity-70">
                Error
              </p>
              <pre className="overflow-auto text-[11px] leading-relaxed text-[var(--destructive)]">
                {summarize(part.errorText)}
              </pre>
            </div>
          )}
          {state === "output-available" && part.output != null && (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-50">
                Result
              </p>
              <pre className="overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--on-surface-variant)]">
                {summarize(part.output, 600)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
