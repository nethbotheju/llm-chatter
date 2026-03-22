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
    <div className="my-2 overflow-hidden rounded-lg border border-muted bg-muted/50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 p-3 text-sm text-muted-foreground transition-colors hover:bg-muted/80"
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
          <div className="border-t border-muted p-3 text-sm italic text-muted-foreground">
            <div className="whitespace-pre-wrap">{content}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
