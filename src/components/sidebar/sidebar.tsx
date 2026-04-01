"use client";

import { useState, useEffect } from "react";
import { Plus, Settings, HelpCircle, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationList } from "./conversation-list";
import { SearchDialog } from "./search-dialog";

interface Conversation {
  id: string;
  title: string | null;
  createdAt: Date;
}

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export function Sidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
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

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 flex h-full w-64 flex-col bg-[var(--surface-container-low)] tracking-tight max-md:hidden">
        {/* Header */}
        <div className="p-6">
          <h1 className="mb-0.5 text-xl font-bold tracking-tighter text-neutral-100">
            Ilm Chatter
          </h1>
          <p className="text-[10px] font-medium text-[var(--on-surface-variant)] opacity-60">
            Anthracite Edition
          </p>
        </div>

        {/* New Chat CTA */}
        <div className="mb-6 px-4">
          <Button
            onClick={onNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 font-semibold text-[var(--primary-foreground)] transition-all hover:opacity-90 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm">New Chat</span>
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex flex-1 flex-col min-h-0">
          <nav className="mb-6 space-y-1 px-2">
            <button className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-[var(--surface-container-high)] hover:text-neutral-100">
              <Network className="h-5 w-5" />
              Projects
            </button>
            <a
              href="/settings"
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-[var(--surface-container-high)] hover:text-neutral-100"
            >
              <Settings className="h-5 w-5" />
              Settings
            </a>
          </nav>

          {/* CHATS section */}
          <div className="mb-2 px-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)] opacity-50">
              Chats
            </span>
          </div>

          <ScrollArea className="flex-1 custom-scrollbar px-2 pb-4">
            <ConversationList
              conversations={conversations}
              activeId={activeConversationId}
              onSelect={onSelectConversation}
              onDelete={onDeleteConversation}
            />
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-[var(--outline-variant)]/10 p-4">
          <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-neutral-400 transition-colors hover:bg-[var(--surface-container-high)] hover:text-neutral-100">
            <HelpCircle className="h-5 w-5" />
            Help
          </button>
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
