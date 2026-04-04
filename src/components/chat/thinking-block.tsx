"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingBlockProps {
  content: string;
  duration?: number;
  defaultExpanded?: boolean;
}

export function ThinkingBlock({
  content,
  duration,
  defaultExpanded = false,
}: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--outline-variant)]/10 bg-[var(--surface-container-low)]">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 p-3 text-sm text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container)]"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <Brain className="h-4 w-4 shrink-0" />
        <span className="font-medium">Thinking</span>
        {duration && (
          <span className="ml-auto text-xs">{(duration / 1000).toFixed(1)}s</span>
        )}
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[var(--outline-variant)]/10 p-3 text-sm italic text-[var(--on-surface-variant)]">
            <div className="whitespace-pre-wrap">{content}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
