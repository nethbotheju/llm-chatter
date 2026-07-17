"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

interface ScrollToLatestButtonProps {
  visible: boolean;
  onClick: () => void;
}

export function ScrollToLatestButton({
  visible,
  onClick,
}: ScrollToLatestButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scroll to latest message"
      className={cn(
        "absolute bottom-full left-1/2 z-40 mb-2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--outline-variant)]/20 bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] shadow-lg backdrop-blur-xl transition-all duration-200 hover:bg-[var(--surface-container-highest)] hover:text-[var(--on-surface)]",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <ChevronDown className="h-5 w-5" />
    </button>
  );
}
