"use client";

import { useState, useEffect, useMemo } from "react";
import {
  SquarePen,
  Settings,
  MessageSquare,
  Search,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationList } from "./conversation-list";
import { SearchDialog } from "./search-dialog";
import { cn } from "@/lib/utils";

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

  const labelClass = cn(
    "overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
    isCollapsed ? "w-0 opacity-0" : "w-auto flex-1 opacity-100"
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
          "fixed left-0 top-0 z-40 flex h-full flex-col bg-[var(--surface-container-low)] tracking-tight transition-[width] duration-300 ease-in-out max-md:hidden",
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
        {!isCollapsed && (
          <div className="flex flex-col gap-0.5 px-3 pb-2 pt-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-base font-medium text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
            >
              <Search className="h-[18px] w-[18px] shrink-0" />
              <span>Search</span>
              <span className="ml-auto text-xs text-[var(--on-surface-variant)] opacity-50">
                ⌘K
              </span>
            </button>

            <button
              onClick={onNewChat}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-base font-medium text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-high)]"
            >
              <SquarePen className="h-[18px] w-[18px] shrink-0" />
              <span>New Chat</span>
            </button>
          </div>
        )}

        {isCollapsed && (
          <div className="flex w-16 flex-col items-center gap-3 pb-2 pt-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
              title="Search"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={onNewChat}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-high)]"
              title="New Chat"
            >
              <SquarePen className="h-[18px] w-[18px]" />
            </button>
          </div>
        )}

        {/* History */}
        <div className="flex flex-1 flex-col min-h-0">
          {!isCollapsed && (
            <ScrollArea className="flex-1 custom-scrollbar px-3">
              <ConversationList
                grouped={grouped}
                activeId={activeConversationId}
                onSelect={onSelectConversation}
                onDelete={onDeleteConversation}
              />
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        {!isCollapsed && (
          <div className="shrink-0 px-3 pb-3 pt-2">
            <a
              href="/settings"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--surface-container-high)]"
              title="Settings"
            >
              <Settings className="h-6 w-6 shrink-0 text-[var(--on-surface)]" />
              <div className="flex flex-col overflow-hidden">
                <span className="text-base font-semibold text-[var(--on-surface)]">
                  Settings
                </span>
                <span className="text-xs text-[var(--on-surface-variant)] opacity-70">
                  Providers, models & more
                </span>
              </div>
            </a>
          </div>
        )}

        {isCollapsed && (
          <div className="shrink-0 flex w-16 justify-center pb-3 pt-2">
            <a
              href="/settings"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </a>
          </div>
        )}
      </aside>

      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectConversation={onSelectConversation}
      />
    </>
  );
}
