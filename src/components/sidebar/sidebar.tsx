"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Settings,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full flex-col bg-[var(--surface-container-low)] tracking-tight transition-[width] duration-300 ease-in-out max-md:hidden",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center">
          <div className="flex w-16 shrink-0 items-center justify-center">
            <MessageSquare className="h-5 w-5 text-neutral-100" />
          </div>
          <div className={labelClass}>
            <h1 className="text-xl font-bold tracking-tighter text-neutral-100">
              llm Chatter
            </h1>
          </div>
        </div>

        {/* New Chat CTA */}
        <div className="mb-6 mt-6 shrink-0">
          {isCollapsed ? (
            <div className="flex w-16 justify-center">
              <Button
                onClick={onNewChat}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] p-0 font-semibold text-[var(--primary-foreground)] transition-all hover:opacity-90 active:scale-95"
                title="New chat"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="px-4">
              <Button
                onClick={onNewChat}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-all hover:opacity-90 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span className="text-[15px]">New Chat</span>
              </Button>
            </div>
          )}
        </div>

        {/* CHATS section */}
        <div className="flex flex-1 flex-col min-h-0">
          {!isCollapsed && (
            <div className="mb-2 px-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)] opacity-50">
                Chats
              </span>
            </div>
          )}

          {!isCollapsed && (
            <ScrollArea className="flex-1 custom-scrollbar px-2 pb-4">
              <ConversationList
                conversations={conversations}
                activeId={activeConversationId}
                onSelect={onSelectConversation}
                onDelete={onDeleteConversation}
              />
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[var(--outline-variant)]/10 py-3">
          <a
            href="/settings"
            className="flex w-full items-center py-2.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-[var(--surface-container-high)] hover:text-neutral-100"
            title="Settings"
          >
            <div className="flex w-16 shrink-0 items-center justify-center">
              <Settings className="h-5 w-5 shrink-0" />
            </div>
            <div className={labelClass}>
              <span>Settings</span>
            </div>
          </a>
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
