"use client";

import { Bell } from "lucide-react";

interface TopAppBarProps {
  assistantName: string | null;
  modelName: string | null;
  assistantDropdown: React.ReactNode;
  modelDropdown: React.ReactNode;
}

export function TopAppBar({
  assistantName,
  modelName,
  assistantDropdown,
  modelDropdown,
}: TopAppBarProps) {
  return (
    <header className="sticky top-0 z-50 flex w-full items-center justify-between px-6 py-4 backdrop-blur-xl"
      style={{ backgroundColor: "rgba(14, 14, 14, 0.7)" }}
    >
      <div className="flex items-center gap-10">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
            Assistant
          </span>
          {assistantDropdown}
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
            Model
          </span>
          {modelDropdown}
        </div>
      </div>
      <div className="flex items-center">
        <button className="text-neutral-400 transition-colors hover:text-white">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
