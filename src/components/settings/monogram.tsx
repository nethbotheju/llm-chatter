import { cn } from "@/lib/utils";

interface MonogramProps {
  name: string;
  className?: string;
}

// A letter monogram derived from a provider name. Used as identity in place of
// generic clip-art icons (Globe/Cpu). Falls back to "?" for empty names.
export function Monogram({ name, className }: MonogramProps) {
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-xl bg-[var(--surface-container-high)] text-sm font-bold text-[var(--on-surface-variant)]",
        className,
      )}
      aria-hidden="true"
    >
      {letter}
    </div>
  );
}
