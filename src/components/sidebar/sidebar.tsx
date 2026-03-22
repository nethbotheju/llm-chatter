"use client";

import { useState, useEffect } from "react";
import { Plus, Settings, Moon, Sun, Search } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationList } from "./conversation-list";
import { SearchDialog } from "./search-dialog";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts";

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
  const { theme, setTheme } = useTheme();
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
      <div className="flex h-full w-64 flex-col border-r bg-muted/30">
        <div className="flex items-center justify-between border-b p-4">
          <h1 className="text-lg font-semibold">LLM Chat</h1>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              title="Search (Cmd+K)"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <KeyboardShortcutsHelp />
            <Link href="/settings">
              <Button variant="ghost" size="icon" title="Settings (Cmd+,)">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="p-2">
          <Button onClick={onNewChat} variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <ConversationList
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={onSelectConversation}
            onDelete={onDeleteConversation}
          />
        </ScrollArea>
      </div>

      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectConversation={onSelectConversation}
      />
    </>
  );
}
