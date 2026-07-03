"use client";

const DELAYS = [0, 150, 300];

export function TypingDots() {
  return (
    <span
      className="inline-flex items-center gap-1"
      role="status"
      aria-label="Assistant is working"
    >
      {DELAYS.map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--primary)]"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
