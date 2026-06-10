"use client";

import { useState, useEffect, useMemo } from "react";
import {
  SquarePen,
  Settings,
  MessageSquare,
  Search,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { ConversationList } from "./conversation-list";
import { SearchDialog } from "./search-dialog";
import { cn } from "@/lib/utils";
import { isElectron } from "@/lib/runtime";

import type { UIConversation } from "@/types";

interface SidebarProps {
  conversations: UIConversation[];
  activeConversationId?: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function isToday(date: Date) {
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

function isYesterday(date: Date) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

function isWithinLast7Days(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

export function Sidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isElectron()) return;
    const cleanup = window.electronAPI!.onAction("open-search", () => setSearchOpen(true));
    return cleanup;
  }, []);

  const labelClass = cn(
    "overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
    isCollapsed ? "max-w-0 opacity-0" : "max-w-[200px] flex-1 opacity-100"
  );

  const grouped = useMemo(() => {
    const today: UIConversation[] = [];
    const yesterday: UIConversation[] = [];
    const last7Days: UIConversation[] = [];
    const earlier: UIConversation[] = [];

    for (const c of conversations) {
      if (isToday(c.createdAt)) {
        today.push(c);
      } else if (isYesterday(c.createdAt)) {
        yesterday.push(c);
      } else if (isWithinLast7Days(c.createdAt)) {
        last7Days.push(c);
      } else {
        earlier.push(c);
      }
    }

    return { today, yesterday, last7Days, earlier };
  }, [conversations]);

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full flex-col overflow-hidden bg-[var(--surface-container-low)] tracking-tight transition-[width] duration-300 ease-in-out max-md:hidden",
          isCollapsed ? "w-16" : "w-[280px]"
        )}
      >
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center">
          <div className="flex w-16 shrink-0 items-center justify-center">
            <MessageSquare className="h-5 w-5 text-[var(--on-surface)]" />
          </div>
          <div className={labelClass}>
            <h1 className="text-xl font-bold tracking-tighter text-[var(--on-surface)]">
              LLM Chatter
            </h1>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-col gap-1 px-2 pb-2 pt-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="group flex w-full items-center rounded-xl py-2.5 transition-all duration-300 ease-in-out hover:bg-[var(--surface-container-high)]"
            title="Search"
          >
            <div className="flex h-5 w-12 shrink-0 items-center justify-center">
              <Search className="h-5 w-5 text-[var(--on-surface-variant)] group-hover:text-[var(--on-surface)]" />
            </div>
            <div className={cn("flex flex-1 items-center overflow-hidden transition-all duration-300 ease-in-out", isCollapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100")}>
              <span className="whitespace-nowrap text-sm font-medium text-[var(--on-surface-variant)] group-hover:text-[var(--on-surface)]">
                Search
              </span>
              <span className="ml-auto pr-3 text-xs text-[var(--on-surface-variant)] opacity-50">
                ⌘K
              </span>
            </div>
          </button>

          <button
            onClick={onNewChat}
            className="group flex w-full items-center rounded-xl py-2.5 transition-all duration-300 ease-in-out hover:bg-[var(--surface-container-high)]"
            title="New Chat"
          >
            <div className="flex h-5 w-12 shrink-0 items-center justify-center">
              <SquarePen className="h-5 w-5 text-[var(--on-surface)]" />
            </div>
            <div className={cn("overflow-hidden transition-all duration-300 ease-in-out", isCollapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100")}>
              <span className="whitespace-nowrap text-sm font-medium text-[var(--on-surface)]">
                New Chat
              </span>
            </div>
          </button>
        </div>

        {/* History */}
        <div className="flex flex-1 flex-col min-h-0">
          <ScrollArea className={cn("flex-1 custom-scrollbar px-2 transition-opacity duration-300", isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100")}>
            <ConversationList
              grouped={grouped}
              activeId={activeConversationId}
              onSelect={onSelectConversation}
              onDelete={onDeleteConversation}
            />
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className={cn("shrink-0 px-2 pb-3 pt-2", isCollapsed ? "pb-6" : "")}>
          <Link
            href="/settings/general"
            className="group flex w-full items-center rounded-xl py-3 transition-all duration-300 ease-in-out hover:bg-[var(--surface-container-high)]"
            title="Settings"
          >
            <div className="flex h-5 w-12 shrink-0 items-center justify-center">
              <Settings className="h-5 w-5 text-[var(--on-surface)]" />
            </div>
            <div className={cn("flex flex-col overflow-hidden transition-all duration-300 ease-in-out", isCollapsed ? "max-h-0 max-w-0 opacity-0" : "max-h-12 max-w-[200px] opacity-100")}>
              <span className="whitespace-nowrap text-sm font-semibold text-[var(--on-surface)]">
                Settings
              </span>
              <span className="whitespace-nowrap text-xs text-[var(--on-surface-variant)] opacity-70">
                Providers, models & more
              </span>
            </div>
          </Link>
        </div>
      </aside>

      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectConversation={onSelectConversation}
      />
    </>
  );
}
