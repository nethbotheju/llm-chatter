"use client";

import { Bell, PanelLeft } from "lucide-react";

interface TopAppBarProps {
  assistantName: string | null;
  modelName: string | null;
  assistantDropdown: React.ReactNode;
  modelDropdown: React.ReactNode;
  onToggleSidebar?: () => void;
}

export function TopAppBar({
  assistantName,
  modelName,
  assistantDropdown,
  modelDropdown,
  onToggleSidebar,
}: TopAppBarProps) {
  return (
    <header className="sticky top-0 z-50 flex w-full items-center justify-between px-6 py-4 backdrop-blur-xl"
      style={{ backgroundColor: "rgba(14, 14, 14, 0.7)" }}
    >
      <div className="flex items-center gap-10">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="mr-2 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-[var(--surface-container-high)] hover:text-white"
            aria-label="Toggle sidebar"
            title="Toggle sidebar (Ctrl/Cmd + B)"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
        )}
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
