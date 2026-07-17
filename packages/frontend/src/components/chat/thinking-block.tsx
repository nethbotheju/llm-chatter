"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";
import { TypingDots } from "./typing-dots";

interface ThinkingBlockProps {
  content: string;
  state: "streaming" | "done";
}

export function ThinkingBlock({ content, state }: ThinkingBlockProps) {
  const isStreaming = state === "streaming";
  const [open, setOpen] = useState(isStreaming);
  const [duration, setDuration] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);
  const [prevStreaming, setPrevStreaming] = useState(isStreaming);

  if (isStreaming !== prevStreaming) {
    setPrevStreaming(isStreaming);
    setOpen(isStreaming);
  }

  useEffect(() => {
    if (!isStreaming) return;
    if (startRef.current == null) startRef.current = performance.now();
    const id = window.setInterval(() => {
      if (startRef.current != null) setDuration(performance.now() - startRef.current);
    }, 100);
    return () => window.clearInterval(id);
  }, [isStreaming]);

  const label = isStreaming ? "Thinking" : "Thought";
  const seconds = duration != null ? (duration / 1000).toFixed(1) : null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            open && "rotate-90",
          )}
        />
        {isStreaming && <TypingDots />}
        <span className="text-sm font-medium">
          {label}
          {isStreaming && "…"}
          {seconds != null && (
            <span className="opacity-70">
              {isStreaming ? ` ${seconds}s` : ` for ${seconds}s`}
            </span>
          )}
        </span>
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-2 border-l border-[var(--outline-variant)]/15 pl-3 text-sm leading-relaxed text-[var(--on-surface-variant)]">
            <div className="whitespace-pre-wrap">{content}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
