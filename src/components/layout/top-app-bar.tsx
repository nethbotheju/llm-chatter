"use client";

import { Bell, PanelLeft } from "lucide-react";
import { isElectron } from "@/lib/runtime";

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
  const electron = isElectron();

  return (
    <header className="app-bar titlebar-drag sticky top-0 z-50 flex w-full items-center justify-between px-6 py-4 backdrop-blur-xl">
      <div className="flex items-center gap-10">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="titlebar-no-drag mr-2 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
            aria-label="Toggle sidebar"
            title="Toggle sidebar (Ctrl/Cmd + B)"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
        )}
        <div className="titlebar-no-drag flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
            Assistant
          </span>
          {assistantDropdown}
        </div>
        <div className="titlebar-no-drag flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
            Model
          </span>
          {modelDropdown}
        </div>
      </div>
      <div className="titlebar-no-drag flex items-center">
        <button className="text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
