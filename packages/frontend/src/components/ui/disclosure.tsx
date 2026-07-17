"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

interface DisclosureProps {
  open: boolean;
  onToggle: () => void;
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export function Disclosure({
  open,
  onToggle,
  header,
  children,
  className,
  headerClassName,
}: DisclosureProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--outline-variant)]/10 bg-[var(--surface-container-low)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-container)]/60",
          headerClassName,
        )}
      >
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          {header}
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[var(--on-surface-variant)] transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
