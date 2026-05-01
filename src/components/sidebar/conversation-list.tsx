"use client";

import { ConversationItem } from "./conversation-item";

import type { UIConversation } from "@/types";

interface ConversationListProps {
  conversations: UIConversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onDelete,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 p-2">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          {...conversation}
          isActive={conversation.id === activeId}
          onClick={() => onSelect(conversation.id)}
          onDelete={() => onDelete(conversation.id)}
        />
      ))}
    </div>
  );
}
