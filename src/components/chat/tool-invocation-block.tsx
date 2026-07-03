"use client";

import { useState } from "react";
import { Wrench, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Disclosure } from "@/components/ui/disclosure";

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

function Section({
  label,
  tone,
  children,
}: {
  label: string;
  tone?: "error";
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className={cn(
          "mb-1 text-[11px] font-medium text-[var(--on-surface-variant)]/70",
          tone === "error" && "text-[var(--destructive)]/80",
        )}
      >
        {label}
      </p>
      <pre className="overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--on-surface-variant)]">
        {children}
      </pre>
    </div>
  );
}

export function ToolInvocationBlock({ part }: ToolInvocationBlockProps) {
  const [open, setOpen] = useState(false);
  const name = toolName(part);
  const state = part.state ?? "input-available";

  const isStreaming = state === "input-streaming";
  const isError = state === "output-error";
  const isDone = state === "output-available";

  return (
    <Disclosure
      open={open}
      onToggle={() => setOpen((o) => !o)}
      header={
        <>
          <Wrench className="h-3.5 w-3.5 shrink-0 text-[var(--on-surface-variant)]" />
          <span className="truncate text-xs font-semibold tracking-tight text-[var(--on-surface)]">
            {name}
          </span>
          <span className="ml-auto flex items-center">
            {isStreaming && (
              <Loader2 className="h-3 w-3 animate-spin text-[var(--on-surface-variant)]" />
            )}
            {isDone && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
            {isError && (
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--destructive)]" />
            )}
          </span>
        </>
      }
    >
      <div className="space-y-2 border-t border-[var(--outline-variant)]/10 px-3 py-2.5">
        {part.input != null && <Section label="Input">{summarize(part.input)}</Section>}
        {isError && part.errorText && (
          <Section label="Error" tone="error">
            {summarize(part.errorText)}
          </Section>
        )}
        {isDone && part.output != null && (
          <Section label="Result">{summarize(part.output, 600)}</Section>
        )}
      </div>
    </Disclosure>
  );
}
